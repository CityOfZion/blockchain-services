import {
  Account,
  BalanceResponse,
  BSAccountHelper,
  BSBigNumberHelper,
  BSError,
  BSTokenHelper,
  BSUtilsHelper,
  IBridgeOrchestrator,
  TBridgeOrchestratorEvents,
  TBridgeToken,
  TBridgeValidateValue,
  TBridgeValue,
  TSwapOrchestratorEvents,
} from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { TNeo3NeoXBridgeOrchestratorInitParams, TNeo3NeoXBridgeOrchestratorWaitParams } from './types'

export class Neo3NeoXBridgeOrchestrator<BSName extends string> implements IBridgeOrchestrator<BSName> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<BSName>>

  fromService: BSNeo3<BSName> | BSNeoX<BSName>
  toService: BSNeo3<BSName> | BSNeoX<BSName>
  #balances: BalanceResponse[] | null = null
  #feeTokenBalance: BalanceResponse | null | undefined = null
  #addressToReceiveTimeout: NodeJS.Timeout | undefined = undefined
  #amountToUseTimeout: NodeJS.Timeout | undefined = undefined

  #internalAvailableTokensToUse: TBridgeValue<TBridgeToken<BSName>[]> = { value: null, loading: false, error: null }
  #internalTokenToUse: TBridgeValue<TBridgeToken<BSName>> = { value: null, loading: false, error: null }
  #internalAccountToUse: TBridgeValue<Account<BSName>> = { value: null, loading: false, error: null }
  #internalAmountToUse: TBridgeValidateValue<string> = { value: null, valid: null, loading: false, error: null }
  #internalAmountToUseMin: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalAmountToUseMax: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalTokenToReceive: TBridgeValue<TBridgeToken<BSName>> = { value: null, loading: false, error: null }
  #internalAddressToReceive: TBridgeValidateValue<string> = { value: null, valid: null, loading: false, error: null }
  #internalAmountToReceive: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalTokenToUseBalance: TBridgeValue<BalanceResponse | undefined> = { value: null, loading: false, error: null }
  #internalBridgeFee: TBridgeValue<string> = { value: null, loading: false, error: null }

  constructor(params: TNeo3NeoXBridgeOrchestratorInitParams<BSName>) {
    this.eventEmitter = new EventEmitter() as TypedEmitter<TSwapOrchestratorEvents>

    const isInitialNeoX = params.initialFromServiceName === params.neoXService.name

    this.fromService = isInitialNeoX ? params.neoXService : params.neo3Service
    this.toService = isInitialNeoX ? params.neo3Service : params.neoXService
  }

  get #availableTokensToUse(): TBridgeValue<TBridgeToken<BSName>[]> {
    return this.#internalAvailableTokensToUse
  }
  set #availableTokensToUse(value: Partial<TBridgeValue<TBridgeToken<BSName>[]>>) {
    this.#internalAvailableTokensToUse = {
      ...this.#internalAvailableTokensToUse,
      ...value,
    }
    this.eventEmitter.emit('availableTokensToUse', this.#internalAvailableTokensToUse)
  }

  get #tokenToUse(): TBridgeValue<TBridgeToken<BSName>> {
    return this.#internalTokenToUse
  }
  set #tokenToUse(value: Partial<TBridgeValue<TBridgeToken<BSName>>>) {
    this.#internalTokenToUse = {
      ...this.#internalTokenToUse,
      ...value,
    }
    this.eventEmitter.emit('tokenToUse', this.#internalTokenToUse)
  }

  get #accountToUse(): TBridgeValue<Account<BSName>> {
    return this.#internalAccountToUse
  }
  set #accountToUse(value: Partial<TBridgeValue<Account<BSName>>>) {
    this.#internalAccountToUse = {
      ...this.#internalAccountToUse,
      ...value,
    }
    this.eventEmitter.emit('accountToUse', this.#internalAccountToUse)
  }

  get #amountToUse(): TBridgeValidateValue<string> {
    return this.#internalAmountToUse
  }
  set #amountToUse(value: Partial<TBridgeValidateValue<string>>) {
    this.#internalAmountToUse = {
      ...this.#internalAmountToUse,
      ...value,
    }
    this.eventEmitter.emit('amountToUse', this.#internalAmountToUse)
  }

  get #amountToUseMin(): TBridgeValue<string> {
    return this.#internalAmountToUseMin
  }
  set #amountToUseMin(value: Partial<TBridgeValue<string>>) {
    this.#internalAmountToUseMin = {
      ...this.#internalAmountToUseMin,
      ...value,
    }
    this.eventEmitter.emit('amountToUseMin', this.#internalAmountToUseMin)
  }

  get #amountToUseMax(): TBridgeValue<string> {
    return this.#internalAmountToUseMax
  }
  set #amountToUseMax(value: Partial<TBridgeValue<string>>) {
    this.#internalAmountToUseMax = {
      ...this.#internalAmountToUseMax,
      ...value,
    }
    this.eventEmitter.emit('amountToUseMax', this.#internalAmountToUseMax)
  }

  get #tokenToReceive(): TBridgeValue<TBridgeToken<BSName>> {
    return this.#internalTokenToReceive
  }
  set #tokenToReceive(value: Partial<TBridgeValue<TBridgeToken<BSName>>>) {
    this.#internalTokenToReceive = {
      ...this.#internalTokenToReceive,
      ...value,
    }
    this.eventEmitter.emit('tokenToReceive', this.#internalTokenToReceive)
  }

  get #addressToReceive(): TBridgeValidateValue<string> {
    return this.#internalAddressToReceive
  }
  set #addressToReceive(value: Partial<TBridgeValidateValue<string>>) {
    this.#internalAddressToReceive = {
      ...this.#internalAddressToReceive,
      ...value,
    }
    this.eventEmitter.emit('addressToReceive', this.#internalAddressToReceive)
  }

  get #amountToReceive(): TBridgeValue<string> {
    return this.#internalAmountToReceive
  }
  set #amountToReceive(value: Partial<TBridgeValue<string>>) {
    this.#internalAmountToReceive = {
      ...this.#internalAmountToReceive,
      ...value,
    }
    this.eventEmitter.emit('amountToReceive', this.#internalAmountToReceive)
  }

  get #tokenToUseBalance(): TBridgeValue<BalanceResponse | undefined> {
    return this.#internalTokenToUseBalance
  }
  set #tokenToUseBalance(value: Partial<TBridgeValue<BalanceResponse>>) {
    this.#internalTokenToUseBalance = {
      ...this.#internalTokenToUseBalance,
      ...value,
    }
    this.eventEmitter.emit('tokenToUseBalance', this.#internalTokenToUseBalance)
  }

  get #bridgeFee(): TBridgeValue<string> {
    return this.#internalBridgeFee
  }
  set #bridgeFee(value: Partial<TBridgeValue<string>>) {
    this.#internalBridgeFee = {
      ...this.#internalBridgeFee,
      ...value,
    }
    this.eventEmitter.emit('bridgeFee', this.#internalBridgeFee)
  }

  #treatError(error: unknown): BSError {
    if (error instanceof BSError) return error
    return new BSError('An unexpected error occurred', 'UNEXPECTED_ERROR', { cause: error })
  }

  async init(): Promise<void> {
    this.#availableTokensToUse = {
      value: this.fromService.neo3NeoXBridgeService.tokens,
    }

    this.#accountToUse = { value: null, loading: false }
    this.#addressToReceive = { value: null, valid: null, loading: false }
    this.#amountToUse = { value: null, valid: null, loading: false }
    this.#amountToUseMin = { value: null, loading: false }
    this.#amountToUseMax = { value: null, loading: false }
    this.#amountToReceive = { value: null, loading: false }
    this.#tokenToUse = { value: null, loading: false }
    this.#tokenToReceive = { value: null, loading: false }
    this.#tokenToUseBalance = { value: null, loading: false }
    this.#bridgeFee = { value: null, loading: false }
    this.#balances = null
    this.#feeTokenBalance = null
  }

  async switchTokens(): Promise<void> {
    const fromService = this.fromService
    const toService = this.toService

    this.fromService = toService
    this.toService = fromService

    const tokenToReceive = this.#tokenToReceive.value

    await this.init()
    await this.setTokenToUse(tokenToReceive)
  }

  async setTokenToUse(token: TBridgeToken<BSName> | null): Promise<void> {
    let tokenToReceive: TBridgeToken<BSName> | undefined

    try {
      if (!this.#availableTokensToUse.value) throw new BSError('No available tokens to use', 'NO_AVAILABLE_TOKENS')

      if (token) {
        if (this.#tokenToUse.value && BSTokenHelper.predicate(this.#tokenToUse.value)(token)) return

        if (!this.#availableTokensToUse.value.some(BSTokenHelper.predicate(token)))
          throw new BSError('You are trying to use a token that is not available', 'TOKEN_NOT_AVAILABLE')

        tokenToReceive = this.toService.neo3NeoXBridgeService.tokens.find(
          item => token.multichainId === item.multichainId
        )

        if (!tokenToReceive) throw new BSError('Pair token not found', 'PAIR_TOKEN_NOT_FOUND')
      }

      this.#tokenToReceive = { value: tokenToReceive ?? null, error: null }
      this.#tokenToUse = { value: token, error: null }
    } catch (error) {
      const treatedError = this.#treatError(error)

      this.#tokenToUse = { error: treatedError }

      throw treatedError
    }

    await Promise.allSettled([this.setBalances(this.#balances), this.setAmountToUse(null)])
  }

  async setAccountToUse(account: Account<BSName> | null): Promise<void> {
    try {
      if (account) {
        if (this.#accountToUse.value && BSAccountHelper.predicate(account)(this.#accountToUse.value)) return

        if (this.fromService.name !== account.blockchain)
          throw new BSError(
            'You are trying to use an account that is not compatible with the selected token',
            'ACCOUNT_NOT_COMPATIBLE_WITH_TOKEN'
          )
      }

      this.#accountToUse = { value: account, error: null }

      await Promise.allSettled([this.setBalances(null), this.setAmountToUse(null)])
    } catch (error) {
      const treatedError = this.#treatError(error)

      this.#accountToUse = { error: treatedError }

      throw treatedError
    }
  }

  async setAddressToReceive(address: string | null): Promise<void> {
    this.#addressToReceive = {
      value: address,
      loading: !!address,
      valid: null,
      error: null,
    }

    if (this.#addressToReceiveTimeout !== null) clearTimeout(this.#addressToReceiveTimeout)

    this.#addressToReceiveTimeout = setTimeout(async () => {
      if (this.#addressToReceive.value) {
        this.#addressToReceive = {
          valid: this.toService.validateAddress(this.#addressToReceive.value),
          loading: false,
        }
      }
    }, 1500)
  }

  async setBalances(balances: BalanceResponse[] | null): Promise<void> {
    this.#balances = balances

    const tokenToUseBalance =
      this.#tokenToUse.value && balances
        ? balances?.find(item => BSTokenHelper.predicateByHash(this.#tokenToUse.value!)(item.token))
        : null

    this.#tokenToUseBalance = {
      value: tokenToUseBalance,
    }

    const feeTokenBalance = balances
      ? balances?.find(item => BSTokenHelper.predicateByHash(this.fromService.feeToken)(item.token))
      : null
    this.#feeTokenBalance = feeTokenBalance

    if (tokenToUseBalance === null || !this.#tokenToUse.value) {
      return
    }

    this.#amountToUseMax = { loading: true, error: null }
    this.#amountToUseMin = { loading: true, error: null }
    this.#bridgeFee = { loading: true, error: null }

    try {
      const constants = await this.fromService.neo3NeoXBridgeService.getBridgeConstants(this.#tokenToUse.value)
      this.#amountToUseMin = { value: constants.bridgeMinAmount }
      this.#bridgeFee = { value: constants.bridgeFee }

      const bridgeMaxAmountBn = BSBigNumberHelper.fromNumber(constants.bridgeMaxAmount)
      const tokenBalanceAmountBn = BSBigNumberHelper.fromNumber(tokenToUseBalance?.amount ?? 0)
      const max = Math.max(
        0,
        Math.min(bridgeMaxAmountBn.toNumber(), tokenBalanceAmountBn.minus(constants.bridgeFee).toNumber())
      )
      this.#amountToUseMax = { value: BSBigNumberHelper.format(max, { decimals: this.#tokenToUse.value.decimals }) }
    } catch (error) {
      const treatedError = this.#treatError(error)

      this.#amountToUseMax = { value: null, error: treatedError }
      this.#amountToUseMin = { value: null, error: treatedError }
      this.#bridgeFee = { value: null, error: treatedError }

      throw treatedError
    } finally {
      this.#amountToUseMax = { loading: false }
      this.#amountToUseMin = { loading: false }
      this.#bridgeFee = { loading: false }
    }
  }

  async setAmountToUse(amount: string | null): Promise<void> {
    this.#amountToUse = { value: amount }

    if (!amount) {
      this.#amountToUse = { valid: null, loading: false }
      this.#amountToReceive = { value: null, loading: false }
      return
    }

    if (this.#amountToUseTimeout !== null) clearTimeout(this.#amountToUseTimeout)

    this.#amountToUseTimeout = setTimeout(async () => {
      if (!this.#tokenToUse.value) return

      const formattedAmount = BSBigNumberHelper.format(amount, { decimals: this.#tokenToUse.value.decimals })
      this.#amountToReceive = { value: formattedAmount }
      this.#amountToUse = { value: formattedAmount }

      try {
        if (
          this.#tokenToUse.value === null ||
          this.#amountToUseMin.value === null ||
          this.#amountToUseMax.value === null ||
          this.#bridgeFee.value === null ||
          this.#accountToUse.value === null ||
          this.#feeTokenBalance === null
        ) {
          return
        }

        this.#amountToUse = { loading: true }
        this.#bridgeFee = { loading: true }

        const amountToUseBn = BSBigNumberHelper.fromNumber(formattedAmount)

        if (amountToUseBn.isLessThan(this.#amountToUseMin.value)) {
          throw new BSError('Amount is below the minimum', 'AMOUNT_BELOW_MINIMUM')
        }

        if (amountToUseBn.isGreaterThan(this.#amountToUseMax.value)) {
          throw new BSError('Amount is above the maximum', 'AMOUNT_ABOVE_MAXIMUM')
        }

        const approvalFee = await this.fromService.neo3NeoXBridgeService
          .getApprovalFee({
            account: this.#accountToUse.value,
            token: this.#tokenToUse.value,
            amount: formattedAmount,
          })
          .then(fee => fee)
          .catch(() => '0')

        const newBridgeFee = BSBigNumberHelper.fromNumber(this.#bridgeFee.value!).plus(approvalFee)
        this.#bridgeFee = {
          value: BSBigNumberHelper.format(newBridgeFee, { decimals: this.fromService.feeToken.decimals }),
        }

        const isFeeToken = BSTokenHelper.predicateByHash(this.fromService.feeToken)(this.#tokenToUse.value)

        if (newBridgeFee.plus(isFeeToken ? amountToUseBn : 0).isGreaterThan(this.#feeTokenBalance?.amount ?? 0)) {
          throw new BSError(
            'You do not have enough fee token balance to cover the bridge fee',
            'INSUFFICIENT_FEE_TOKEN_BALANCE'
          )
        }

        this.#amountToUse = { valid: true }
      } catch (error) {
        const treatedError = this.#treatError(error)

        this.#amountToUse = { valid: false, error: treatedError }
      } finally {
        this.#amountToUse = { loading: false }
        this.#bridgeFee = { loading: false }
      }
    }, 1500)
  }

  async bridge(): Promise<string> {
    if (
      !this.#accountToUse.value ||
      !this.#tokenToUse.value ||
      !this.#tokenToReceive.value ||
      !this.#amountToUse.valid ||
      !this.#amountToUse.value ||
      !this.#amountToReceive.value ||
      !this.#addressToReceive.value ||
      !this.#bridgeFee.value
    ) {
      throw new BSError('Required parameters are not set for bridging', 'BRIDGE_NOT_READY')
    }

    const transaction = await this.fromService.neo3NeoXBridgeService.bridge({
      account: this.#accountToUse.value,
      token: this.#tokenToUse.value,
      amount: this.#amountToUse.value,
      receiverAddress: this.#addressToReceive.value,
      bridgeFee: this.#bridgeFee.value,
    })

    return transaction
  }

  static async wait<BSName extends string = string>({
    tokenToUse,
    tokenToReceive,
    transactionHash,
    neo3Service,
    neoXService,
  }: TNeo3NeoXBridgeOrchestratorWaitParams<BSName>) {
    const isNeo3Service = tokenToUse.blockchain === neo3Service.name

    const fromService = isNeo3Service ? neo3Service : neoXService
    const toService = isNeo3Service ? neoXService : neo3Service

    const nonce = await BSUtilsHelper.retry(
      () =>
        fromService.neo3NeoXBridgeService.getNonce({
          token: tokenToUse,
          transactionHash,
        }),
      {
        retries: 10,
        delay: 30000,
      }
    )

    await BSUtilsHelper.retry(
      () => toService.neo3NeoXBridgeService.getTransactionHashByNonce({ nonce, token: tokenToReceive }),
      {
        retries: 10,
        delay: 30000,
      }
    )
  }
}
