import {
  Account,
  Network,
  SwapRoute,
  SwapService,
  SwapServiceEvents,
  SwapServiceSwapArgs,
  SwapServiceSwapToReceiveArgs,
  SwapServiceSwapToUseArgs,
  Token,
} from '@cityofzion/blockchain-service'
import { wallet } from '@cityofzion/neon-core'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import Transport from '@ledgerhq/hw-transport'
import EventEmitter from 'events'
import cloneDeep from 'lodash.clonedeep'
import TypedEmitter from 'typed-emitter'
import { FlamingoSwapInvocationBuilderNeo3 } from '../../builder/invocation/FlamingoSwapInvocationBuilderNeo3'
import { BSNeo3NetworkId } from '../../helpers/BSNeo3Helper'
import { FlamingoSwapHelper } from '../../helpers/FlamingoSwapHelper'
import { NeonDappKitLedgerServiceNeo3 } from '../ledger/NeonDappKitLedgerServiceNeo3'
import { FlamingoSwapDetailsHandler, FlamingoSwapRouteHandler, FlamingoSwapSocketService } from './handlers'

type BuildSwapInvocationArgs = SwapServiceSwapToUseArgs<BSNeo3NetworkId> | SwapServiceSwapToReceiveArgs<BSNeo3NetworkId>

type LastAmountChanged = 'amountToReceive' | 'amountToUse' | null

export class FlamingoSwapServiceNeo3 implements SwapService<BSNeo3NetworkId> {
  eventEmitter: TypedEmitter<SwapServiceEvents>

  #ledgerService!: NeonDappKitLedgerServiceNeo3
  #network: Network<BSNeo3NetworkId>
  #privateAccountToUse: Account | null = null
  #privateTokenToReceive: Token | null = null
  #privateTokenToUse: Token | null = null
  #privateAmountToReceive: string | null = null
  #privateAmountToUse: string | null = null
  #privateMinimumReceived: string | null = null
  #privateMaximumSelling: string | null = null
  #privateSlippage: number = 0.5
  #privateDeadline: string = '10'
  #privatePriceInverse: string | null = null
  #privatePriceImpact: string | null = null
  #privateLiquidityProviderFee: string | null = null
  #privateRoute: SwapRoute[] = []
  #privateLastAmountChanged: LastAmountChanged = null
  #socket: FlamingoSwapSocketService = new FlamingoSwapSocketService()

  constructor(network: Network<BSNeo3NetworkId>, ledgerService: NeonDappKitLedgerServiceNeo3) {
    this.eventEmitter = new EventEmitter() as TypedEmitter<SwapServiceEvents>
    this.#network = network
    this.#ledgerService = ledgerService
  }

  buildSwapInvocationArgs(): BuildSwapInvocationArgs {
    if (
      !this.#accountToUse ||
      !this.#amountToReceive ||
      !this.#amountToUse ||
      !this.#tokenToReceive ||
      !this.#tokenToUse ||
      this.#route.length <= 0
    ) {
      throw new Error('Required parameters are not set')
    }

    const routePath = FlamingoSwapHelper.getRoutePath(this.#route)

    const baseSwapArgs: SwapServiceSwapArgs<BSNeo3NetworkId> = {
      address: this.#accountToUse.address,
      deadline: this.#deadline,
      network: this.#network,
      routePath,
    }

    if (this.#lastAmountChanged === 'amountToReceive') {
      if (!this.#maximumSelling) throw new Error("maximumSelling is required for 'amountToReceive' swap type")

      return {
        ...baseSwapArgs,
        amountToReceive: this.#amountToReceive,
        maximumSelling: this.#maximumSelling,
        type: 'swapTokenToReceive',
      }
    }

    if (!this.#minimumReceived) throw new Error("minimumReceived is required for 'amountToUse' swap type")

    return {
      ...baseSwapArgs,
      amountToUse: this.#amountToUse,
      minimumReceived: this.#minimumReceived,
      type: 'swapTokenToUse',
    }
  }

  listSwappableTokensSymbol(network: Network<BSNeo3NetworkId>): string[] {
    return Object.keys(FlamingoSwapRouteHandler.createPoolGraph(network))
  }

  async swap(isLedger?: boolean): Promise<void> {
    const swapInvocationArgs = this.buildSwapInvocationArgs()

    let ledgerTransport: Transport | undefined

    if (isLedger) {
      if (!this.#ledgerService.getLedgerTransport) {
        throw new Error('You must provide a getLedgerTransport function to use Ledger')
      }

      ledgerTransport = await this.#ledgerService.getLedgerTransport(this.#accountToUse!)
    }

    const account = new wallet.Account(this.#accountToUse!.key)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#network.url,
      account,
      signingCallback: ledgerTransport ? this.#ledgerService.getSigningCallback(ledgerTransport) : undefined,
    })

    await invoker.invokeFunction(FlamingoSwapInvocationBuilderNeo3.swapInvocation(swapInvocationArgs))
  }

  startListeningBlockGeneration(): void {
    const callback = async () => await this.#setReserves()

    callback()

    this.#socket.onBlockAdded({ callback })
  }

  stopListeningBlockGeneration(): void {
    this.#socket.closeConnection()
  }

  setAccountToUse(account: Account | null): void {
    this.#accountToUse = account
  }

  setAmountToUse(val: string | null): void {
    this.#amountToUse = val

    this.#lastAmountChanged = 'amountToUse'

    this.#recalculateSwapArguments()
  }

  setAmountToReceive(val: string | null): void {
    this.#amountToReceive = val

    this.#lastAmountChanged = 'amountToReceive'

    this.#recalculateSwapArguments()
  }

  setDeadline(deadline: string): void {
    this.#deadline = deadline
  }

  setSlippage(slippage: number): void {
    this.#slippage = slippage

    this.#recalculateSwapArguments()
  }

  async setTokenToUse(val: Token | null): Promise<void> {
    this.#tokenToUse = val

    await this.#recalculateRoute()

    this.#recalculateSwapArguments()
  }

  async setTokenToReceive(val: Token | null): Promise<void> {
    this.#tokenToReceive = val

    await this.#recalculateRoute()

    this.#recalculateSwapArguments()
  }

  async #setReserves() {
    if (!this.#tokenToReceive || !this.#tokenToUse) return

    await this.#recalculateRoute()

    this.#recalculateSwapArguments()
  }

  #clearFields() {
    this.#amountToUse = null
    this.#amountToReceive = null
    this.#minimumReceived = null
    this.#maximumSelling = null
    this.#liquidityProviderFee = null
    this.#priceImpact = null
    this.#priceInverse = null
  }

  #recalculateSwapArguments() {
    if (!this.#tokenToReceive || !this.#tokenToUse) return

    if (
      (this.#lastAmountChanged === 'amountToReceive' && this.#amountToReceive) ||
      (this.#lastAmountChanged === 'amountToUse' && this.#amountToUse)
    ) {
      const amountToReceive = this.#lastAmountChanged === 'amountToReceive' ? this.#amountToReceive : null
      const amountToUse = this.#lastAmountChanged === 'amountToUse' ? this.#amountToUse : null

      const {
        amountToUseToDisplay,
        amountToReceiveToDisplay,
        maximumSelling,
        minimumReceived,
        liquidityProviderFee,
        priceImpact,
        priceInverse,
      } = FlamingoSwapDetailsHandler.calculateSwapDetails({
        network: this.#network,
        amountToReceive,
        amountToUse,
        tokenToUse: this.#tokenToUse,
        tokenToReceive: this.#tokenToReceive,
        slippage: this.#slippage,
        route: cloneDeep(this.#route),
      })

      this.#amountToUse = amountToUseToDisplay
      this.#amountToReceive = amountToReceiveToDisplay
      this.#maximumSelling = maximumSelling
      this.#minimumReceived = minimumReceived
      this.#liquidityProviderFee = liquidityProviderFee
      this.#priceImpact = priceImpact
      this.#priceInverse = priceInverse

      return
    }

    this.#clearFields()
  }

  async #recalculateRoute() {
    if (!this.#tokenToReceive || !this.#tokenToUse) return

    this.#route = await FlamingoSwapRouteHandler.calculateBestRouteForSwap({
      tokenToReceive: this.#tokenToReceive,
      tokenToUse: this.#tokenToUse,
      network: this.#network,
    })
  }

  // Getters and setters
  get #lastAmountChanged(): 'amountToReceive' | 'amountToUse' | null {
    return this.#privateLastAmountChanged
  }
  set #lastAmountChanged(val: 'amountToReceive' | 'amountToUse' | null) {
    this.#privateLastAmountChanged = val
    this.eventEmitter.emit('lastAmountChanged', val)
  }

  get #accountToUse(): Account | null {
    return this.#privateAccountToUse
  }
  set #accountToUse(val: Account | null) {
    this.#privateAccountToUse = val
    this.eventEmitter.emit('accountToUse', val)
  }

  get #amountToUse(): string | null {
    return this.#privateAmountToUse
  }
  set #amountToUse(val: string | null) {
    this.#privateAmountToUse = val
    this.eventEmitter.emit('amountToUse', val)
  }

  get #minimumReceived(): string | null {
    return this.#privateMinimumReceived
  }
  set #minimumReceived(val: string | null) {
    this.#privateMinimumReceived = val
    this.eventEmitter.emit('minimumReceived', val)
  }

  get #maximumSelling(): string | null {
    return this.#privateMaximumSelling
  }
  set #maximumSelling(val: string | null) {
    this.#privateMaximumSelling = val
    this.eventEmitter.emit('maximumSelling', val)
  }

  get #amountToReceive(): string | null {
    return this.#privateAmountToReceive
  }
  set #amountToReceive(val: string | null) {
    this.#privateAmountToReceive = val
    this.eventEmitter.emit('amountToReceive', val)
  }

  get #deadline(): string {
    return this.#privateDeadline
  }
  set #deadline(val: string) {
    this.#privateDeadline = val
    this.eventEmitter.emit('deadline', val)
  }

  get #liquidityProviderFee(): string | null {
    return this.#privateLiquidityProviderFee
  }
  set #liquidityProviderFee(val: string | null) {
    this.#privateLiquidityProviderFee = val
    this.eventEmitter.emit('liquidityProviderFee', val)
  }

  get #priceImpact(): string | null {
    return this.#privatePriceImpact
  }
  set #priceImpact(val: string | null) {
    this.#privatePriceImpact = val
    this.eventEmitter.emit('priceImpact', val)
  }

  get #priceInverse(): string | null {
    return this.#privatePriceInverse
  }
  set #priceInverse(val: string | null) {
    this.#privatePriceInverse = val
    this.eventEmitter.emit('priceInverse', val)
  }

  get #route(): SwapRoute[] {
    return this.#privateRoute
  }
  set #route(val: SwapRoute[]) {
    this.#privateRoute = val
    this.eventEmitter.emit('route', val)
  }

  get #slippage(): number {
    return this.#privateSlippage
  }
  set #slippage(val: number) {
    this.#privateSlippage = val
    this.eventEmitter.emit('slippage', val)
  }

  get #tokenToReceive(): Token | null {
    return this.#privateTokenToReceive
  }
  set #tokenToReceive(val: Token | null) {
    this.#privateTokenToReceive = val
    this.eventEmitter.emit('tokenToReceive', val)
  }

  get #tokenToUse(): Token | null {
    return this.#privateTokenToUse
  }
  set #tokenToUse(val: Token | null) {
    this.#privateTokenToUse = val
    this.eventEmitter.emit('tokenToUse', val)
  }
}
