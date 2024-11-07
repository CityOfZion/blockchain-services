import {
  Account,
  BlockchainService,
  isCalculableFee,
  SwapService,
  SwapServiceEvents,
  SwapServiceLoadableValue,
  SwapServiceMinMaxAmount,
  SwapServiceStatusResponse,
  SwapServiceSwapResult,
  SwapServiceToken,
  SwapServiceValidateValue,
} from '@cityofzion/blockchain-service'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { debounce } from 'lodash'
import { SimpleSwapApi } from '../apis/SimpleSwapApi'
import { SimpleSwapApiCurrency, SimpleSwapServiceInitParams } from '../types/simpleSwap'

type TRecalculateValuesParam<BSName extends string = string> = (keyof SwapServiceEvents<BSName>)[]

export class SimpleSwapService<BSName extends string = string> implements SwapService<BSName> {
  eventEmitter: TypedEmitter<SwapServiceEvents<BSName>>

  #api: SimpleSwapApi<BSName>
  #blockchainServicesByName: Record<BSName, BlockchainService<BSName>>

  #internalExchangeId: string | undefined = undefined
  #internalTransactionHash: string | undefined = undefined

  #internalAvailableTokensToUse: SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]> = {
    loading: true,
    value: null,
  }
  #internalTokenToUse: SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>> = { loading: false, value: null }
  #internalAccountToUse: SwapServiceValidateValue<Account<BSName>> = { loading: false, value: null, valid: null }
  #internalAmountToUse: SwapServiceLoadableValue<string> = { loading: false, value: null }
  #internalAmountToUseMinMax: SwapServiceLoadableValue<SwapServiceMinMaxAmount> = { loading: false, value: null }
  #internalAvailableTokensToReceive: SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]> = {
    loading: false,
    value: null,
  }
  #internalTokenToReceive: SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>> = { loading: false, value: null }
  #internalAddressToReceive: SwapServiceValidateValue<string> = { loading: false, value: null, valid: null }
  #internalAmountToReceive: SwapServiceLoadableValue<string> = { loading: false, value: null }

  constructor(params: SimpleSwapServiceInitParams<BSName>) {
    this.eventEmitter = new EventEmitter() as TypedEmitter<SwapServiceEvents>
    this.#api = new SimpleSwapApi(params)
    this.#blockchainServicesByName = params.blockchainServicesByName
  }

  get #availableTokensToUse(): SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]> {
    return this.#internalAvailableTokensToUse
  }
  set #availableTokensToUse(availableTokens: Partial<SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]>>) {
    this.#internalAvailableTokensToUse = { ...this.#internalAvailableTokensToUse, ...availableTokens }
    this.eventEmitter.emit('availableTokensToUse', this.#internalAvailableTokensToUse)
  }

  get #tokenToUse(): SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>> {
    return this.#internalTokenToUse
  }
  set #tokenToUse(tokenToUse: Partial<SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>>>) {
    this.#internalTokenToUse = { ...this.#internalTokenToUse, ...tokenToUse }
    this.eventEmitter.emit('tokenToUse', this.#internalTokenToUse)
  }

  get #accountToUse(): SwapServiceValidateValue<Account<BSName>> {
    return this.#internalAccountToUse
  }
  set #accountToUse(accountToUse: Partial<SwapServiceValidateValue<Account<BSName>>>) {
    this.#internalAccountToUse = { ...this.#internalAccountToUse, ...accountToUse }
    this.eventEmitter.emit('accountToUse', this.#internalAccountToUse)
  }

  get #amountToUse(): SwapServiceLoadableValue<string> {
    return this.#internalAmountToUse
  }
  set #amountToUse(amountToUse: Partial<SwapServiceLoadableValue<string>>) {
    this.#internalAmountToUse = { ...this.#internalAmountToUse, ...amountToUse }
    this.eventEmitter.emit('amountToUse', this.#internalAmountToUse)
  }

  get #amountToUseMinMax(): SwapServiceLoadableValue<SwapServiceMinMaxAmount> {
    return this.#internalAmountToUseMinMax
  }
  set #amountToUseMinMax(amountToUseMinMax: Partial<SwapServiceLoadableValue<SwapServiceMinMaxAmount>>) {
    this.#internalAmountToUseMinMax = { ...this.#internalAmountToUseMinMax, ...amountToUseMinMax }
    this.eventEmitter.emit('amountToUseMinMax', this.#internalAmountToUseMinMax)
  }

  get #availableTokensToReceive(): SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]> {
    return this.#internalAvailableTokensToReceive
  }
  set #availableTokensToReceive(availableTokens: Partial<SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>[]>>) {
    this.#internalAvailableTokensToReceive = { ...this.#internalAvailableTokensToReceive, ...availableTokens }
    this.eventEmitter.emit('availableTokensToReceive', this.#internalAvailableTokensToReceive)
  }

  get #tokenToReceive(): SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>> {
    return this.#internalTokenToReceive
  }
  set #tokenToReceive(tokenToReceive: Partial<SwapServiceLoadableValue<SimpleSwapApiCurrency<BSName>>>) {
    this.#internalTokenToReceive = { ...this.#internalTokenToReceive, ...tokenToReceive }
    this.eventEmitter.emit('tokenToReceive', this.#internalTokenToReceive)
  }

  get #addressToReceive(): SwapServiceValidateValue<string> {
    return this.#internalAddressToReceive
  }
  set #addressToReceive(addressToReceive: Partial<SwapServiceValidateValue<string>>) {
    this.#internalAddressToReceive = { ...this.#internalAddressToReceive, ...addressToReceive }
    this.eventEmitter.emit('addressToReceive', this.#internalAddressToReceive)
  }

  get #amountToReceive(): SwapServiceLoadableValue<string> {
    return this.#internalAmountToReceive
  }
  set #amountToReceive(amountToReceive: Partial<SwapServiceLoadableValue<string>>) {
    this.#internalAmountToReceive = { ...this.#internalAmountToReceive, ...amountToReceive }
    this.eventEmitter.emit('amountToReceive', this.#internalAmountToReceive)
  }

  async #recalculateValues(fieldsToRecalculate: TRecalculateValuesParam<BSName>) {
    try {
      if (this.#tokenToUse.value === null) {
        return
      }

      if (this.#addressToReceive.value && this.#tokenToReceive.value) {
        this.#addressToReceive = {
          valid: RegExp(this.#tokenToReceive.value.validationAddress).test(this.#addressToReceive.value),
        }
      }

      if (this.#accountToUse.value) {
        this.#accountToUse = { valid: this.#tokenToUse.value.blockchain === this.#accountToUse.value.blockchain }
      }

      const shouldRecalculateAmountToUse =
        fieldsToRecalculate.includes('amountToUse') &&
        this.#amountToUse.value === null &&
        this.#tokenToReceive.value !== null
      const shouldRecalculateAmountToReceive =
        fieldsToRecalculate.includes('amountToReceive') && this.#tokenToReceive.value !== null
      const shouldRecalculateAmountToUseMinMax =
        fieldsToRecalculate.includes('amountToUseMinMax') && this.#tokenToReceive.value !== null
      const shouldRecalculateAvailableTokensToReceive = fieldsToRecalculate.includes('availableTokensToReceive')

      this.#availableTokensToReceive = { loading: shouldRecalculateAvailableTokensToReceive }
      this.#amountToUseMinMax = { loading: shouldRecalculateAmountToUseMinMax }
      this.#amountToUse = { loading: shouldRecalculateAmountToUse }
      this.#amountToReceive = { loading: shouldRecalculateAmountToReceive }

      if (shouldRecalculateAvailableTokensToReceive) {
        const pairs = await this.#api.getPairs(this.#tokenToUse.value.ticker, this.#tokenToUse.value.network)
        this.#availableTokensToReceive = { value: pairs }

        if (this.#tokenToUse.value && !pairs.some(pair => pair.ticker === this.#tokenToUse.value!.ticker)) {
          this.#tokenToReceive = { value: null }
        }
      }

      if (shouldRecalculateAmountToUseMinMax || shouldRecalculateAmountToUse || shouldRecalculateAmountToReceive) {
        let range: SwapServiceMinMaxAmount | null = this.#amountToUseMinMax.value

        if (shouldRecalculateAmountToUseMinMax || range === null) {
          range = await this.#api.getRange(this.#tokenToUse.value, this.#tokenToReceive.value!)
        }

        this.#amountToUseMinMax = { value: range }

        if (shouldRecalculateAmountToUse) {
          this.#amountToUse = { value: range.min }
        }

        if (shouldRecalculateAmountToReceive) {
          this.#amountToReceive = {
            value: await this.#api.getEstimate(
              this.#tokenToUse.value,
              this.#tokenToReceive.value!,
              this.#amountToUse.value!
            ),
          }
        }
      }
    } finally {
      this.#availableTokensToReceive = { loading: false }
      this.#amountToUseMinMax = { loading: false }
      this.#amountToUse = { loading: false }
      this.#amountToReceive = { loading: false }
    }
  }

  async init() {
    const tokens = await this.#api.getCurrencies()
    this.#availableTokensToUse = { loading: false, value: tokens }
  }

  async setTokenToUse(token: SwapServiceToken<BSName> | null): Promise<void> {
    if (!this.#availableTokensToUse.value) throw new Error('Available tokens to use is not set')

    let simpleSwapCurrency: SimpleSwapApiCurrency<BSName> | null = null

    if (token) {
      simpleSwapCurrency = this.#availableTokensToUse.value.find(item => item.id === token.id) ?? null
      if (!simpleSwapCurrency) throw new Error('You are trying to use a token that is not available')
    }

    this.#tokenToUse = { loading: false, value: simpleSwapCurrency }

    if (this.#accountToUse.value?.blockchain !== simpleSwapCurrency?.blockchain) {
      this.#accountToUse = { loading: false, value: null }
    }

    await this.#recalculateValues(['amountToReceive', 'availableTokensToReceive', 'amountToUseMinMax', 'amountToUse'])
  }

  async setAccountToUse(account: Account<BSName> | null): Promise<void> {
    this.#accountToUse = { value: account }
    await this.#recalculateValues([])
  }

  async setAmountToUse(amount: string | null): Promise<void> {
    this.#amountToUse = { value: amount }

    debounce(this.#recalculateValues.bind(this), 500)(['amountToReceive'])
  }

  async setTokenToReceive(token: SwapServiceToken<BSName> | null): Promise<void> {
    if (!this.#availableTokensToReceive.value) throw new Error('Available tokens to receive is not set')

    let simpleSwapCurrency: SimpleSwapApiCurrency<BSName> | null = null

    if (token) {
      simpleSwapCurrency = this.#availableTokensToReceive.value.find(item => item.id === token.id) ?? null
      if (!simpleSwapCurrency) throw new Error('You are trying to use a token that is not available')
    }

    this.#tokenToReceive = {
      value: simpleSwapCurrency ? { ...token, ...simpleSwapCurrency } : null,
    }

    await this.#recalculateValues(['amountToReceive', 'amountToUseMinMax', 'amountToUse'])
  }

  async setAddressToReceive(address: string | null): Promise<void> {
    this.#addressToReceive = {
      loading: false,
      value: address,
    }
    await this.#recalculateValues([])
  }

  async swap(): Promise<SwapServiceSwapResult> {
    if (
      !this.#tokenToUse.value ||
      !this.#tokenToReceive.value ||
      !this.#accountToUse.value ||
      !this.#addressToReceive.value ||
      !this.#addressToReceive.valid ||
      !this.#amountToUse.value ||
      !this.#amountToReceive.value ||
      !this.#tokenToUse.value.hash
    ) {
      throw new Error('Not all required fields are set')
    }

    const { depositAddress, id } = await this.#api.createExchange(
      this.#tokenToReceive.value,
      this.#tokenToUse.value,
      this.#amountToUse.value,
      this.#addressToReceive.value,
      this.#accountToUse.value.address
    )

    const service = this.#blockchainServicesByName[this.#accountToUse.value.blockchain]

    const [transactionHash] = await service.transfer({
      senderAccount: this.#accountToUse.value,
      intents: [
        {
          amount: this.#amountToUse.value,
          receiverAddress: depositAddress,
          tokenHash: this.#tokenToUse.value.hash,
          tokenDecimals: this.#tokenToUse.value.decimals,
        },
      ],
    })

    this.#internalExchangeId = id
    this.#internalTransactionHash = transactionHash

    return {
      id,
      // SimpleSwap always make 2 transactions
      numberOfTransactions: 2,
      transactionHash: transactionHash,
    }
  }

  async calculateFee(): Promise<string> {
    if (
      !this.#tokenToUse.value ||
      !this.#tokenToReceive.value ||
      !this.#accountToUse.value ||
      !this.#addressToReceive.value ||
      !this.#addressToReceive.valid ||
      !this.#amountToUse.value ||
      !this.#amountToReceive.value ||
      !this.#tokenToUse.value.hash
    ) {
      throw new Error('Not all required fields are set')
    }

    const service = this.#blockchainServicesByName[this.#accountToUse.value.blockchain]
    if (!isCalculableFee(service)) return '0'

    return await service.calculateTransferFee({
      senderAccount: this.#accountToUse.value,
      intents: [
        {
          amount: this.#amountToUse.value,
          // In this point, we don't have the deposit address, so we use the sender address
          // It can cause a mistake in the fee calculation
          receiverAddress: this.#accountToUse.value.address,
          tokenHash: this.#tokenToUse.value.hash,
          tokenDecimals: this.#tokenToUse.value.decimals,
        },
      ],
    })
  }

  async getStatus(): Promise<SwapServiceStatusResponse> {
    if (!this.#internalExchangeId || !this.#internalTransactionHash) throw new Error('You need to execute a swap first')

    const response = await this.#api.getExchange(this.#internalExchangeId)

    const transactionHashes: string[] = [this.#internalTransactionHash]

    if (response.txTo) transactionHashes.push(response.txTo)

    const statusBySimpleSwapStatus: Record<string, SwapServiceStatusResponse['status']> = {
      waiting: 'confirming',
      confirming: 'confirming',
      exchanging: 'exchanging',
      sending: 'exchanging',
      verifying: 'exchanging',
      finished: 'finished',
      expired: 'failed',
      failed: 'failed',
      refunded: 'failed',
    }

    const status = statusBySimpleSwapStatus[response.status]

    return {
      status,
      transactionHashes: transactionHashes,
    }
  }
}