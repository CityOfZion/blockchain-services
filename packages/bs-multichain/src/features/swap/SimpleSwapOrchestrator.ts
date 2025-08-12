import {
  Account,
  BlockchainService,
  BSBigNumberHelper,
  isCalculableFee,
  ISwapOrchestrator,
  TSwapOrchestratorEvents,
  TSwapLoadableValue,
  TSwapMinMaxAmount,
  TSwapResult,
  TSwapToken,
  TSwapValidateValue,
} from '@cityofzion/blockchain-service'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { SimpleSwapApi } from './SimpleSwapApi'
import { TSimpleSwapApiCurrency, TSimpleSwapOrchestratorInitParams } from './types'

type TRecalculateValuesParam<BSName extends string = string> = (keyof TSwapOrchestratorEvents<BSName>)[]

export class SimpleSwapOrchestrator<BSName extends string = string> implements ISwapOrchestrator<BSName> {
  eventEmitter: TypedEmitter<TSwapOrchestratorEvents<BSName>>

  #api: SimpleSwapApi<BSName>
  #blockchainServicesByName: Record<BSName, BlockchainService<BSName>>
  #chainsByServiceName: Partial<Record<BSName, string[]>>
  #amountToUseTimeout: NodeJS.Timeout | null = null

  #internalAvailableTokensToUse: TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]> = {
    loading: false,
    value: null,
  }
  #internalTokenToUse: TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>> = { loading: false, value: null }
  #internalAccountToUse: TSwapValidateValue<Account<BSName>> = { loading: false, value: null, valid: null }
  #internalAmountToUse: TSwapLoadableValue<string> = { loading: false, value: null }
  #internalAmountToUseMinMax: TSwapLoadableValue<TSwapMinMaxAmount> = { loading: false, value: null }
  #internalAvailableTokensToReceive: TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]> = {
    loading: false,
    value: null,
  }
  #internalTokenToReceive: TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>> = { loading: false, value: null }
  #internalAddressToReceive: TSwapValidateValue<string> = { loading: false, value: null, valid: null }
  #internalExtraIdToReceive: TSwapValidateValue<string> = { loading: false, value: null, valid: null }
  #internalAmountToReceive: TSwapLoadableValue<string> = { loading: false, value: null }

  constructor(params: TSimpleSwapOrchestratorInitParams<BSName>) {
    this.eventEmitter = new EventEmitter() as TypedEmitter<TSwapOrchestratorEvents>
    this.#api = new SimpleSwapApi()
    this.#blockchainServicesByName = params.blockchainServicesByName
    this.#chainsByServiceName = params.chainsByServiceName
  }

  #createSwapToken(token: TSimpleSwapApiCurrency<BSName>): TSwapToken<BSName> {
    return {
      id: token.id,
      blockchain: token.blockchain,
      imageUrl: token.imageUrl,
      symbol: token.symbol,
      name: token.name,
      hash: token.hash,
      decimals: token.decimals,
      addressTemplateUrl: token.addressTemplateUrl,
      txTemplateUrl: token.txTemplateUrl,
      network: token.network,
      hasExtraId: token.hasExtraId,
    }
  }

  get #availableTokensToUse(): TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]> {
    return this.#internalAvailableTokensToUse
  }
  set #availableTokensToUse(availableTokens: Partial<TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]>>) {
    this.#internalAvailableTokensToUse = { ...this.#internalAvailableTokensToUse, ...availableTokens }

    this.eventEmitter.emit('availableTokensToUse', {
      ...this.#internalAvailableTokensToUse,
      value: !this.#internalAvailableTokensToUse.value
        ? this.#internalAvailableTokensToUse.value
        : this.#internalAvailableTokensToUse.value.map(this.#createSwapToken),
    })
  }

  get #tokenToUse(): TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>> {
    return this.#internalTokenToUse
  }
  set #tokenToUse(tokenToUse: Partial<TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>>>) {
    this.#internalTokenToUse = { ...this.#internalTokenToUse, ...tokenToUse }

    this.eventEmitter.emit('tokenToUse', {
      ...this.#internalTokenToUse,
      value: !this.#internalTokenToUse.value
        ? this.#internalTokenToUse.value
        : this.#createSwapToken(this.#internalTokenToUse.value),
    })
  }

  get #accountToUse(): TSwapValidateValue<Account<BSName>> {
    return this.#internalAccountToUse
  }
  set #accountToUse(accountToUse: Partial<TSwapValidateValue<Account<BSName>>>) {
    this.#internalAccountToUse = { ...this.#internalAccountToUse, ...accountToUse }
    this.eventEmitter.emit('accountToUse', this.#internalAccountToUse)
  }

  get #amountToUse(): TSwapLoadableValue<string> {
    return this.#internalAmountToUse
  }
  set #amountToUse(amountToUse: Partial<TSwapLoadableValue<string>>) {
    this.#internalAmountToUse = { ...this.#internalAmountToUse, ...amountToUse }
    this.eventEmitter.emit('amountToUse', this.#internalAmountToUse)
  }

  get #amountToUseMinMax(): TSwapLoadableValue<TSwapMinMaxAmount> {
    return this.#internalAmountToUseMinMax
  }
  set #amountToUseMinMax(amountToUseMinMax: Partial<TSwapLoadableValue<TSwapMinMaxAmount>>) {
    this.#internalAmountToUseMinMax = { ...this.#internalAmountToUseMinMax, ...amountToUseMinMax }
    this.eventEmitter.emit('amountToUseMinMax', this.#internalAmountToUseMinMax)
  }

  get #availableTokensToReceive(): TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]> {
    return this.#internalAvailableTokensToReceive
  }
  set #availableTokensToReceive(availableTokens: Partial<TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>[]>>) {
    this.#internalAvailableTokensToReceive = { ...this.#internalAvailableTokensToReceive, ...availableTokens }

    this.eventEmitter.emit('availableTokensToReceive', {
      ...this.#internalAvailableTokensToReceive,
      value: !this.#internalAvailableTokensToReceive.value
        ? this.#internalAvailableTokensToReceive.value
        : this.#internalAvailableTokensToReceive.value.map(this.#createSwapToken),
    })
  }

  get #tokenToReceive(): TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>> {
    return this.#internalTokenToReceive
  }
  set #tokenToReceive(tokenToReceive: Partial<TSwapLoadableValue<TSimpleSwapApiCurrency<BSName>>>) {
    this.#internalTokenToReceive = { ...this.#internalTokenToReceive, ...tokenToReceive }

    this.eventEmitter.emit('tokenToReceive', {
      ...this.#internalTokenToReceive,
      value: !this.#internalTokenToReceive.value
        ? this.#internalTokenToReceive.value
        : this.#createSwapToken(this.#internalTokenToReceive.value),
    })
  }

  get #addressToReceive(): TSwapValidateValue<string> {
    return this.#internalAddressToReceive
  }
  set #addressToReceive(addressToReceive: Partial<TSwapValidateValue<string>>) {
    this.#internalAddressToReceive = { ...this.#internalAddressToReceive, ...addressToReceive }
    this.eventEmitter.emit('addressToReceive', this.#internalAddressToReceive)
  }

  get #extraIdToReceive(): TSwapValidateValue<string> {
    return this.#internalExtraIdToReceive
  }

  set #extraIdToReceive(extraIdToReceive: Partial<TSwapValidateValue<string>>) {
    if (extraIdToReceive.value === '') extraIdToReceive.value = null

    this.#internalExtraIdToReceive = { ...this.#internalExtraIdToReceive, ...extraIdToReceive }

    this.eventEmitter.emit('extraIdToReceive', this.#internalExtraIdToReceive)
  }

  get #amountToReceive(): TSwapLoadableValue<string> {
    return this.#internalAmountToReceive
  }
  set #amountToReceive(amountToReceive: Partial<TSwapLoadableValue<string>>) {
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

      if (this.#extraIdToReceive.value && this.#tokenToReceive.value) {
        const extraIdToReceive = this.#extraIdToReceive.value.trim()

        this.#extraIdToReceive = {
          valid:
            !extraIdToReceive || !this.#tokenToReceive.value.validationExtra
              ? true
              : RegExp(this.#tokenToReceive.value.validationExtra).test(extraIdToReceive),
        }
      }

      if (this.#accountToUse.value) {
        this.#accountToUse = { valid: this.#tokenToUse.value.blockchain === this.#accountToUse.value.blockchain }
      }

      const shouldRecalculateAvailableTokensToReceive = fieldsToRecalculate.includes('availableTokensToReceive')
      const shouldRecalculateAmountToUse =
        fieldsToRecalculate.includes('amountToUse') &&
        this.#amountToUse.value === null &&
        this.#tokenToReceive.value !== null
      const shouldRecalculateAmountToReceive =
        fieldsToRecalculate.includes('amountToReceive') && this.#tokenToReceive.value !== null
      const shouldRecalculateAmountToUseMinMax =
        fieldsToRecalculate.includes('amountToUseMinMax') && this.#tokenToReceive.value !== null

      this.#availableTokensToReceive = { loading: shouldRecalculateAvailableTokensToReceive }
      this.#amountToUseMinMax = { loading: shouldRecalculateAmountToUseMinMax }
      this.#amountToUse = { loading: shouldRecalculateAmountToUse }
      this.#amountToReceive = { loading: shouldRecalculateAmountToReceive }

      if (shouldRecalculateAvailableTokensToReceive) {
        try {
          const pairs = await this.#api.getPairs(this.#tokenToUse.value.ticker, this.#tokenToUse.value.network)
          this.#availableTokensToReceive = { value: pairs }

          if (this.#tokenToUse.value && !pairs.some(pair => pair.ticker === this.#tokenToUse.value!.ticker)) {
            this.#tokenToReceive = { value: null }
          }
        } catch (error: any) {
          this.eventEmitter.emit('error', error.message)
          this.#availableTokensToReceive = { value: null }
          this.#tokenToReceive = { value: null }
          this.#amountToUseMinMax = { value: null }
          this.#amountToReceive = { value: null }
          this.#addressToReceive = { value: null, valid: null }
          this.#extraIdToReceive = { value: null, valid: null }
          throw error
        }
      }

      if (shouldRecalculateAmountToUseMinMax || shouldRecalculateAmountToUse || shouldRecalculateAmountToReceive) {
        let range: TSwapMinMaxAmount | null = this.#amountToUseMinMax.value
        try {
          if ((shouldRecalculateAmountToUseMinMax || range === null) && this.#tokenToReceive.value) {
            const { decimals } = this.#tokenToUse.value
            const rangeResponse = await this.#api.getRange(this.#tokenToUse.value, this.#tokenToReceive.value)

            // Add 1% because the SimpleSwap sends us a smaller minimum than the required
            const minWithOnePercent = BSBigNumberHelper.format((Number(rangeResponse.min) * 1.01).toString(), {
              decimals,
            })

            // Add the smallest number to round up correctly because the SimpleSwap doesn't have the decimals, and we need to apply the decimals here
            const smallestNumberToRoundUp = decimals ? `0.${'2'.padStart(decimals, '0')}` : '1'

            range = {
              min: BSBigNumberHelper.format(Number(minWithOnePercent) + Number(smallestNumberToRoundUp), {
                decimals,
              }),
              max: rangeResponse.max ? BSBigNumberHelper.format(rangeResponse.max, { decimals }) : rangeResponse.max,
            }
          }

          this.#amountToUseMinMax = { value: range }

          if (shouldRecalculateAmountToUse && range) {
            this.#amountToUse = {
              value: range.min
                ? BSBigNumberHelper.format(range.min, { decimals: this.#tokenToUse.value.decimals })
                : range.min,
            }
          }
        } catch (error: any) {
          this.eventEmitter.emit('error', error.message)
          this.#amountToUseMinMax = { value: null }
          this.#amountToReceive = { value: null }
          throw error
        }

        if (shouldRecalculateAmountToReceive && this.#tokenToReceive.value && this.#amountToUse.value) {
          try {
            const estimate = await this.#api.getEstimate(
              this.#tokenToUse.value,
              this.#tokenToReceive.value,
              this.#amountToUse.value
            )

            this.#amountToReceive = {
              value: estimate,
            }
          } catch (error: any) {
            this.eventEmitter.emit('error', error.message)
            this.#amountToReceive = { value: null }
            throw error
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
    try {
      this.#availableTokensToUse = { loading: true }

      const tokens = await this.#api.getCurrencies({
        blockchainServicesByName: this.#blockchainServicesByName,
        chainsByServiceName: this.#chainsByServiceName,
      })

      const filteredTokens = tokens.filter(token => token.blockchain && token.hash)

      this.#availableTokensToUse = { loading: false, value: filteredTokens }
    } catch (error: any) {
      this.#availableTokensToUse = { loading: false, value: [] }
      this.eventEmitter.emit('error', error.message)
      throw error
    }
  }

  async setTokenToUse(token: TSwapToken<BSName> | null): Promise<void> {
    this.#amountToReceive = { loading: false, value: null }
    this.#amountToUseMinMax = { loading: false, value: null }
    this.#tokenToUse = { loading: true }

    if (!this.#availableTokensToUse.value) throw new Error('Available tokens to use is not set')

    let simpleSwapCurrency: TSimpleSwapApiCurrency<BSName> | null = null

    if (token) {
      simpleSwapCurrency = this.#availableTokensToUse.value.find(item => item.id === token.id) ?? null
      if (!simpleSwapCurrency) throw new Error('You are trying to use a token that is not available')
    }

    if (simpleSwapCurrency && simpleSwapCurrency.decimals === undefined) {
      if (!simpleSwapCurrency?.blockchain || !simpleSwapCurrency.hash) throw new Error('Token is not valid')

      let decimals = 6

      try {
        const service = this.#blockchainServicesByName[simpleSwapCurrency.blockchain]
        const tokenInfo = await service.blockchainDataService.getTokenInfo(simpleSwapCurrency.hash)
        decimals = tokenInfo.decimals
      } catch {
        /* empty */
      }

      simpleSwapCurrency.decimals = decimals
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
    this.#amountToUse = {
      value: amount,
    }

    if (this.#amountToUseTimeout !== null) clearTimeout(this.#amountToUseTimeout)

    this.#amountToUseTimeout = setTimeout(() => {
      this.#amountToUse = {
        value: this.#amountToUse.value
          ? BSBigNumberHelper.format(this.#amountToUse.value, {
              decimals: this.#tokenToUse.value?.decimals,
            })
          : this.#amountToUse.value,
      }
      this.#recalculateValues(['amountToReceive'])
    }, 1500)
  }

  async setTokenToReceive(token: TSwapToken<BSName> | null): Promise<void> {
    this.#extraIdToReceive = { value: null, valid: null }
    this.#amountToReceive = { loading: false, value: null }
    this.#amountToUseMinMax = { loading: false, value: null }

    if (!this.#availableTokensToReceive.value) throw new Error('Available tokens to receive is not set')

    let simpleSwapCurrency: TSimpleSwapApiCurrency<BSName> | null = null

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

  async setExtraIdToReceive(extraIdToReceive: string | null): Promise<void> {
    if (!this.#tokenToReceive.value?.hasExtraId) return

    this.#extraIdToReceive = { value: extraIdToReceive, valid: null }

    await this.#recalculateValues([])
  }

  async swap(): Promise<TSwapResult> {
    if (
      !this.#tokenToUse.value ||
      !this.#tokenToReceive.value ||
      !this.#accountToUse.value ||
      !this.#addressToReceive.value ||
      !this.#addressToReceive.valid ||
      !this.#amountToUse.value ||
      !this.#amountToReceive.value ||
      !this.#tokenToUse.value.hash ||
      (this.#tokenToReceive.value.hasExtraId &&
        (!this.#extraIdToReceive.valid || !this.#extraIdToReceive.value?.trim()))
    ) {
      throw new Error('Not all required fields are set')
    }

    const result: TSwapResult = {
      id: '',
      txFrom: undefined,
      log: undefined,
    }

    try {
      const { depositAddress, id, log } = await this.#api.createExchange({
        currencyFrom: this.#tokenToUse.value,
        currencyTo: this.#tokenToReceive.value,
        amount: this.#amountToUse.value,
        refundAddress: this.#accountToUse.value.address,
        address: this.#addressToReceive.value,
        extraIdToReceive: this.#extraIdToReceive.value,
      })

      result.id = id
      result.log = log

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

      result.txFrom = transactionHash
    } catch {
      // empty
    }

    return result
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

    const { blockchain } = this.#accountToUse.value
    const service = this.#blockchainServicesByName[blockchain]

    if (!isCalculableFee(service)) return '0'

    return await service.calculateTransferFee({
      senderAccount: this.#accountToUse.value,
      intents: [
        {
          amount: this.#amountToUse.value,
          receiverAddress:
            this.#tokenToReceive.value.blockchain === blockchain
              ? this.#addressToReceive.value
              : this.#accountToUse.value.address,
          tokenHash: this.#tokenToUse.value.hash,
          tokenDecimals: this.#tokenToUse.value.decimals,
        },
      ],
    })
  }
}
