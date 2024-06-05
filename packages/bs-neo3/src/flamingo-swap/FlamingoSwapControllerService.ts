import {
  Account,
  Network,
  SwapControllerService,
  SwapControllerServiceEvents,
  SwapControllerServiceSwapArgs,
  SwapControllerServiceSwapToReceiveArgs,
  SwapControllerServiceSwapToUseArgs,
  SwapRoute,
  Token,
} from '@cityofzion/blockchain-service'
import TypedEmitter from 'typed-emitter'
import EventEmitter from 'events'
import { FlamingoSwapNeonDappKitInvocationBuilder } from './FlamingoSwapNeonDappKitInvocationBuilder'
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { wallet } from '@cityofzion/neon-core'
import {
  CustomNetworkNotSupportedError,
  FlamingoInvalidReservesResponseError,
  FlamingoSwapMissingParametersError,
} from './FlamingoSwapError'
import { FlamingoSwapHelper } from './FlamingoSwapHelper'
import WebSocket from 'isomorphic-ws'
import { BLOCKCHAIN_WSS_URL } from '../constants'

export class FlamingoSwapControllerService implements SwapControllerService {
  eventEmitter: TypedEmitter<SwapControllerServiceEvents>
  ws: WebSocket

  readonly #network: Network

  #accountToUse: Account | null = null

  #tokenToReceive: Token | null = null

  #tokenToUse: Token | null = null

  #amountToReceive: string | null = null
  #amountToUse: string | null = null

  #minimumReceived: string | null = null
  #maximumSelling: string | null = null

  #reservesToReceive: string | null = null
  #reservesToUse: string | null = null

  #slippage: number = 0.5
  #deadline: string = '10'

  #priceInverse: string | null = null
  #priceImpact: string | null = null
  #liquidityProviderFee: string | null = null

  #routes: SwapRoute[] | null = null

  #lastAmountChange: 'amountToReceive' | 'amountToUse' | null = null

  constructor(network: Network) {
    if (network.type === 'custom') throw new CustomNetworkNotSupportedError()

    this.#network = network
    this.eventEmitter = new EventEmitter() as TypedEmitter<SwapControllerServiceEvents>
  }

  buildSwapArgs(): SwapControllerServiceSwapToReceiveArgs | SwapControllerServiceSwapToUseArgs {
    if (!this.accountToUse) throw new FlamingoSwapMissingParametersError('accountToUse')
    if (!this.amountToReceive) throw new FlamingoSwapMissingParametersError('amountToReceive')
    if (!this.amountToUse) throw new FlamingoSwapMissingParametersError('amountToUse')
    if (!this.tokenToReceive) throw new FlamingoSwapMissingParametersError('tokenToReceive')
    if (!this.tokenToUse) throw new FlamingoSwapMissingParametersError('tokenToUse')

    const baseSwapArgs: SwapControllerServiceSwapArgs = {
      address: this.accountToUse.address,
      amountToReceive: this.amountToReceive,
      amountToUse: this.amountToUse,
      tokenToReceive: this.tokenToReceive,
      tokenToUse: this.tokenToUse,
      deadline: this.deadline,
      network: this.#network,
    }

    if (this.lastAmountChange === 'amountToReceive') {
      if (!this.maximumSelling) throw new FlamingoSwapMissingParametersError('maximumSelling')

      return {
        ...baseSwapArgs,
        maximumSelling: this.maximumSelling,
        type: 'swapTokenToReceive',
      }
    }

    if (!this.minimumReceived) throw new FlamingoSwapMissingParametersError('minimumReceived')

    return {
      ...baseSwapArgs,
      minimumReceived: this.minimumReceived,
      type: 'swapTokenToUse',
    }
  }

  setAccountToUse(account: Account | null): void {
    this.accountToUse = account
  }

  setAmountToUse(val: string | null): void {
    this.amountToUse = val

    this.lastAmountChange = 'amountToUse'

    this.recalculateSwapArguments()
  }

  setAmountToReceive(val: string | null): void {
    this.amountToReceive = val

    this.lastAmountChange = 'amountToReceive'

    this.recalculateSwapArguments()
  }

  setDeadline(deadline: string): void {
    this.deadline = deadline
  }

  setSlippage(slippage: number): void {
    this.slippage = slippage

    this.recalculateSwapArguments()
  }

  async setTokenToUse(val: Token | null): Promise<void> {
    this.tokenToUse = val

    await this.setReserves()
  }

  async setTokenToReceive(val: Token | null): Promise<void> {
    this.tokenToReceive = val

    await this.setReserves()
  }

  async swap(isLedger?: boolean): Promise<void> {
    if (isLedger) throw new Error('Method not implemented.')
    if (!this.accountToUse) throw new FlamingoSwapMissingParametersError('accountToUse')

    const swapArguments = this.buildSwapArgs()

    const neonInvokerAccount = new wallet.Account(this.accountToUse)
    const invoker = await NeonInvoker.init({
      rpcAddress: this.#network.url,
      account: neonInvokerAccount,
    })

    await invoker.invokeFunction(FlamingoSwapNeonDappKitInvocationBuilder.swapInvocation(swapArguments))
  }

  async setReserves() {
    if (!this.tokenToReceive || !this.tokenToUse) return

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#network.url,
    })

    const invocation = FlamingoSwapNeonDappKitInvocationBuilder.getReservesInvocation({
      network: this.#network,
      tokenToReceiveScriptHash: this.tokenToReceive.hash,
      tokenToUseScriptHash: this.tokenToUse.hash,
    })

    const { stack } = await invoker.testInvoke(invocation)
    if (
      !TypeChecker.isStackTypeArray(stack[0]) ||
      !TypeChecker.isStackTypeInteger(stack[0].value[0]) ||
      !TypeChecker.isStackTypeInteger(stack[0].value[1])
    )
      throw new FlamingoInvalidReservesResponseError()

    this.reservesToReceive = stack[0].value[0].value
    this.reservesToUse = stack[0].value[1].value

    this.recalculateSwapArguments()
  }

  startListeningBlockGeneration() {
    this.ws = new WebSocket(BLOCKCHAIN_WSS_URL)

    this.ws.onopen = () => {
      const block_added = {
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ['block_added'],
        id: 1,
      }
      this.ws.send(JSON.stringify(block_added))
    }

    this.ws.onmessage = async () => {
      this.setReserves()
    }
  }

  stopListeningBlockGeneration() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private recalculateSwapArguments() {
    if (!this.tokenToReceive || !this.tokenToUse || !this.reservesToReceive || !this.reservesToUse) return

    if (
      (this.lastAmountChange === 'amountToReceive' && this.amountToReceive) ||
      (this.lastAmountChange === 'amountToUse' && this.amountToUse)
    ) {
      const amountToReceive = this.lastAmountChange === 'amountToReceive' ? this.amountToReceive : null
      const amountToUse = this.lastAmountChange === 'amountToUse' ? this.amountToUse : null

      const {
        amountToUseToDisplay,
        amountToReceiveToDisplay,
        maximumSelling,
        minimumReceived,
        liquidityProviderFee,
        priceImpact,
        priceInverse,
      } = FlamingoSwapHelper.getSwapFields({
        network: this.#network,
        amountToReceive,
        amountToUse,
        tokenToUse: this.tokenToUse,
        tokenToReceive: this.tokenToReceive,
        reservesToUse: this.reservesToUse,
        reservesToReceive: this.reservesToReceive,
        slippage: this.slippage,
      })

      this.amountToUse = amountToUseToDisplay
      this.amountToReceive = amountToReceiveToDisplay
      this.maximumSelling = maximumSelling
      this.minimumReceived = minimumReceived
      this.liquidityProviderFee = liquidityProviderFee
      this.priceImpact = priceImpact
      this.priceInverse = priceInverse
      this.routes = [] // TODO: It will be implemented in Swap Multi Invoke issue

      return
    }

    this.clearFields()
  }

  private clearFields() {
    this.amountToUse = null
    this.amountToReceive = null
    this.minimumReceived = null
    this.maximumSelling = null
    this.liquidityProviderFee = null
    this.priceImpact = null
    this.priceInverse = null
  }

  // Getters and setters
  private get lastAmountChange(): 'amountToReceive' | 'amountToUse' | null {
    return this.#lastAmountChange
  }
  private set lastAmountChange(val: 'amountToReceive' | 'amountToUse' | null) {
    this.#lastAmountChange = val
    this.eventEmitter.emit('lastAmountChanged', val)
  }

  private get accountToUse(): Account | null {
    return this.#accountToUse
  }
  private set accountToUse(val: Account | null) {
    this.#accountToUse = val
    this.eventEmitter.emit('accountToUse', val)
  }

  private get amountToUse(): string | null {
    return this.#amountToUse
  }
  private set amountToUse(val: string | null) {
    this.#amountToUse = val
    this.eventEmitter.emit('amountToUse', val)
  }

  private get minimumReceived(): string | null {
    return this.#minimumReceived
  }
  private set minimumReceived(val: string | null) {
    this.#minimumReceived = val
    this.eventEmitter.emit('minimumReceived', val)
  }

  private get maximumSelling(): string | null {
    return this.#maximumSelling
  }
  private set maximumSelling(val: string | null) {
    this.#maximumSelling = val
    this.eventEmitter.emit('maximumSelling', val)
  }

  private get amountToReceive(): string | null {
    return this.#amountToReceive
  }
  private set amountToReceive(val: string | null) {
    this.#amountToReceive = val
    this.eventEmitter.emit('amountToReceive', val)
  }

  private get deadline(): string {
    return this.#deadline
  }
  private set deadline(val: string) {
    this.#deadline = val
    this.eventEmitter.emit('deadline', val)
  }

  private get liquidityProviderFee(): string | null {
    return this.#liquidityProviderFee
  }
  private set liquidityProviderFee(val: string | null) {
    this.#liquidityProviderFee = val
    this.eventEmitter.emit('liquidityProviderFee', val)
  }

  private get priceImpact(): string | null {
    return this.#priceImpact
  }
  private set priceImpact(val: string | null) {
    this.#priceImpact = val
    this.eventEmitter.emit('priceImpact', val)
  }

  private get priceInverse(): string | null {
    return this.#priceInverse
  }
  private set priceInverse(val: string | null) {
    this.#priceInverse = val
    this.eventEmitter.emit('priceInverse', val)
  }

  private get routes(): SwapRoute[] | null {
    return this.#routes
  }
  private set routes(val: SwapRoute[] | null) {
    this.#routes = val
    this.eventEmitter.emit('routes', val)
  }

  private get reservesToUse(): string | null {
    return this.#reservesToUse
  }
  private set reservesToUse(val: string | null) {
    this.#reservesToUse = val
    this.eventEmitter.emit('reservesToUse', val)
  }

  private get reservesToReceive(): string | null {
    return this.#reservesToReceive
  }
  private set reservesToReceive(val: string | null) {
    this.#reservesToReceive = val
    this.eventEmitter.emit('reservesToReceive', val)
  }

  private get slippage(): number {
    return this.#slippage
  }
  private set slippage(val: number) {
    this.#slippage = val
    this.eventEmitter.emit('slippage', val)
  }

  private get tokenToReceive(): Token | null {
    return this.#tokenToReceive
  }
  private set tokenToReceive(val: Token | null) {
    this.#tokenToReceive = val
    this.eventEmitter.emit('tokenToReceive', val)
  }

  private get tokenToUse(): Token | null {
    return this.#tokenToUse
  }
  private set tokenToUse(val: Token | null) {
    this.#tokenToUse = val
    this.eventEmitter.emit('tokenToUse', val)
  }
}
