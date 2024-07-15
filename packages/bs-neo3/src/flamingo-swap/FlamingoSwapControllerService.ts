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
import { FlamingoSwapHelper } from './FlamingoSwapHelper'
import WebSocket from 'isomorphic-ws'
import { AvailableNetworkIds } from '../BSNeo3Helper'

const BLOCKCHAIN_WSS_URL = 'wss://rpc10.n3.nspcc.ru:10331/ws'

export class FlamingoSwapControllerService implements SwapControllerService<AvailableNetworkIds> {
  eventEmitter: TypedEmitter<SwapControllerServiceEvents>

  #ws: WebSocket

  #network: Network<AvailableNetworkIds>

  #privateAccountToUse: Account | null = null

  #privateTokenToReceive: Token | null = null

  #privateTokenToUse: Token | null = null

  #privateAmountToReceive: string | null = null
  #privateAmountToUse: string | null = null

  #privateMinimumReceived: string | null = null
  #privateMaximumSelling: string | null = null

  #privateReservesToReceive: string | null = null
  #privateReservesToUse: string | null = null

  #privateSlippage: number = 0.5
  #privateDeadline: string = '10'

  #privatePriceInverse: string | null = null
  #privatePriceImpact: string | null = null
  #privateLiquidityProviderFee: string | null = null

  #privateRoutes: SwapRoute[] | null = null

  #privateLastAmountChange: 'amountToReceive' | 'amountToUse' | null = null

  constructor(network: Network<AvailableNetworkIds>) {
    this.#network = network
    this.eventEmitter = new EventEmitter() as TypedEmitter<SwapControllerServiceEvents>
  }

  buildSwapArgs():
    | SwapControllerServiceSwapToReceiveArgs<AvailableNetworkIds>
    | SwapControllerServiceSwapToUseArgs<AvailableNetworkIds> {
    if (
      !this.#accountToUse ||
      !this.#amountToReceive ||
      !this.#amountToUse ||
      !this.#tokenToReceive ||
      !this.#tokenToUse
    )
      throw new Error('Required parameters are not set')

    const baseSwapArgs: SwapControllerServiceSwapArgs<AvailableNetworkIds> = {
      address: this.#accountToUse.address,
      amountToReceive: this.#amountToReceive,
      amountToUse: this.#amountToUse,
      tokenToReceive: this.#tokenToReceive,
      tokenToUse: this.#tokenToUse,
      deadline: this.#deadline,
      network: this.#network,
    }

    if (this.#lastAmountChange === 'amountToReceive') {
      if (!this.#maximumSelling) throw new Error("maximumSelling is required for 'amountToReceive' swap type")

      return {
        ...baseSwapArgs,
        maximumSelling: this.#maximumSelling,
        type: 'swapTokenToReceive',
      }
    }

    if (!this.#minimumReceived) throw new Error("minimumReceived is required for 'amountToUse' swap type")

    return {
      ...baseSwapArgs,
      minimumReceived: this.#minimumReceived,
      type: 'swapTokenToUse',
    }
  }

  setAccountToUse(account: Account | null): void {
    this.#accountToUse = account
  }

  setAmountToUse(val: string | null): void {
    this.#amountToUse = val

    this.#lastAmountChange = 'amountToUse'

    this.#recalculateSwapArguments()
  }

  setAmountToReceive(val: string | null): void {
    this.#amountToReceive = val

    this.#lastAmountChange = 'amountToReceive'

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

    await this.setReserves()
  }

  async setTokenToReceive(val: Token | null): Promise<void> {
    this.#tokenToReceive = val

    await this.setReserves()
  }

  async swap(isLedger?: boolean): Promise<void> {
    if (isLedger) throw new Error('Method not implemented.')

    const swapArguments = this.buildSwapArgs()

    const neonInvokerAccount = new wallet.Account(this.#accountToUse!)
    const invoker = await NeonInvoker.init({
      rpcAddress: this.#network.url,
      account: neonInvokerAccount,
    })

    await invoker.invokeFunction(FlamingoSwapNeonDappKitInvocationBuilder.swapInvocation(swapArguments))
  }

  async setReserves() {
    if (!this.#tokenToReceive || !this.#tokenToUse) return

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#network.url,
    })

    const invocation = FlamingoSwapNeonDappKitInvocationBuilder.getReservesInvocation({
      network: this.#network,
      tokenToReceiveScriptHash: this.#tokenToReceive.hash,
      tokenToUseScriptHash: this.#tokenToUse.hash,
    })

    const { stack } = await invoker.testInvoke(invocation)
    if (
      !TypeChecker.isStackTypeArray(stack[0]) ||
      !TypeChecker.isStackTypeInteger(stack[0].value[0]) ||
      !TypeChecker.isStackTypeInteger(stack[0].value[1])
    )
      throw new Error('Invalid reserves response')

    this.#reservesToReceive = stack[0].value[0].value
    this.#reservesToUse = stack[0].value[1].value

    this.#recalculateSwapArguments()
  }

  startListeningBlockGeneration() {
    this.#ws = new WebSocket(BLOCKCHAIN_WSS_URL)

    this.#ws.onopen = () => {
      const block_added = {
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ['block_added'],
        id: 1,
      }
      this.#ws.send(JSON.stringify(block_added))
    }

    this.#ws.onmessage = async () => {
      this.setReserves()
    }
  }

  stopListeningBlockGeneration() {
    if (this.#ws) {
      this.#ws.close()
      this.#ws = null
    }
  }

  #recalculateSwapArguments() {
    if (!this.#tokenToReceive || !this.#tokenToUse || !this.#reservesToReceive || !this.#reservesToUse) return

    if (
      (this.#lastAmountChange === 'amountToReceive' && this.#amountToReceive) ||
      (this.#lastAmountChange === 'amountToUse' && this.#amountToUse)
    ) {
      const amountToReceive = this.#lastAmountChange === 'amountToReceive' ? this.#amountToReceive : null
      const amountToUse = this.#lastAmountChange === 'amountToUse' ? this.#amountToUse : null

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
        tokenToUse: this.#tokenToUse,
        tokenToReceive: this.#tokenToReceive,
        reservesToUse: this.#reservesToUse,
        reservesToReceive: this.#reservesToReceive,
        slippage: this.#slippage,
      })

      this.#amountToUse = amountToUseToDisplay
      this.#amountToReceive = amountToReceiveToDisplay
      this.#maximumSelling = maximumSelling
      this.#minimumReceived = minimumReceived
      this.#liquidityProviderFee = liquidityProviderFee
      this.#priceImpact = priceImpact
      this.#priceInverse = priceInverse
      this.#routes = [] // TODO: It will be implemented in Swap Multi Invoke issue

      return
    }

    this.#clearFields()
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

  // Getters and setters
  get #lastAmountChange(): 'amountToReceive' | 'amountToUse' | null {
    return this.#privateLastAmountChange
  }
  set #lastAmountChange(val: 'amountToReceive' | 'amountToUse' | null) {
    this.#privateLastAmountChange = val
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

  get #routes(): SwapRoute[] | null {
    return this.#privateRoutes
  }
  set #routes(val: SwapRoute[] | null) {
    this.#privateRoutes = val
    this.eventEmitter.emit('routes', val)
  }

  get #reservesToUse(): string | null {
    return this.#privateReservesToUse
  }
  set #reservesToUse(val: string | null) {
    this.#privateReservesToUse = val
    this.eventEmitter.emit('reservesToUse', val)
  }

  get #reservesToReceive(): string | null {
    return this.#privateReservesToReceive
  }
  set #reservesToReceive(val: string | null) {
    this.#privateReservesToReceive = val
    this.eventEmitter.emit('reservesToReceive', val)
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
