import {
  BSAccountHelper,
  BSError,
  BSUtilsHelper,
  BSBigNumber,
  type TBSAccount,
  type TBalanceResponse,
  type IBridgeOrchestrator,
  type TBridgeOrchestratorEvents,
  type TBridgeToken,
  type TBridgeValidateValue,
  type TBridgeValue,
  type TSwapOrchestratorEvents,
  type INeo3NeoXBridgeService,
  type TBSBridgeName,
  BSBigHumanAmount,
} from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import type { TNeo3NeoXBridgeOrchestratorInitParams, TNeo3NeoXBridgeOrchestratorWaitParams } from './types'

export class Neo3NeoXBridgeOrchestrator implements IBridgeOrchestrator<TBSBridgeName> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<TBSBridgeName>>

  fromService: BSNeo3 | BSNeoX
  toService: BSNeo3 | BSNeoX
  #balances: TBalanceResponse[] | null = null
  #feeTokenBalance: TBalanceResponse | null | undefined = null
  #addressToReceiveTimeout: NodeJS.Timeout | undefined = undefined
  #amountToUseTimeout: NodeJS.Timeout | undefined = undefined

  #internalAvailableTokensToUse: TBridgeValue<TBridgeToken<TBSBridgeName>[]> = {
    value: null,
    loading: false,
    error: null,
  }
  #internalTokenToUse: TBridgeValue<TBridgeToken<TBSBridgeName>> = { value: null, loading: false, error: null }
  #internalAccountToUse: TBridgeValue<TBSAccount<TBSBridgeName>> = { value: null, loading: false, error: null }
  #internalAmountToUse: TBridgeValidateValue<string> = { value: null, valid: null, loading: false, error: null }
  #internalAmountToUseMin: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalAmountToUseMax: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalTokenToReceive: TBridgeValue<TBridgeToken<TBSBridgeName>> = { value: null, loading: false, error: null }
  #internalAddressToReceive: TBridgeValidateValue<string> = { value: null, valid: null, loading: false, error: null }
  #internalAmountToReceive: TBridgeValue<string> = { value: null, loading: false, error: null }
  #internalTokenToUseBalance: TBridgeValue<TBalanceResponse | undefined> = { value: null, loading: false, error: null }
  #internalBridgeFee: TBridgeValue<string> = { value: null, loading: false, error: null }

  constructor(params: TNeo3NeoXBridgeOrchestratorInitParams) {
    this.eventEmitter = new EventEmitter() as TypedEmitter<TSwapOrchestratorEvents<TBSBridgeName>>

    const isInitialNeoX = params.initialFromServiceName === params.neoXService.name

    this.fromService = isInitialNeoX ? params.neoXService : params.neo3Service
    this.toService = isInitialNeoX ? params.neo3Service : params.neoXService
  }

  get #availableTokensToUse(): TBridgeValue<TBridgeToken<TBSBridgeName>[]> {
    return this.#internalAvailableTokensToUse
  }
  set #availableTokensToUse(value: Partial<TBridgeValue<TBridgeToken<TBSBridgeName>[]>>) {
    this.#internalAvailableTokensToUse = {
      ...this.#internalAvailableTokensToUse,
      ...value,
    }
    this.eventEmitter.emit('availableTokensToUse', this.#internalAvailableTokensToUse)
  }

  get #tokenToUse(): TBridgeValue<TBridgeToken<TBSBridgeName>> {
    return this.#internalTokenToUse
  }
  set #tokenToUse(value: Partial<TBridgeValue<TBridgeToken<TBSBridgeName>>>) {
    this.#internalTokenToUse = {
      ...this.#internalTokenToUse,
      ...value,
    }
    this.eventEmitter.emit('tokenToUse', this.#internalTokenToUse)
  }

  get #accountToUse(): TBridgeValue<TBSAccount<TBSBridgeName>> {
    return this.#internalAccountToUse
  }
  set #accountToUse(value: Partial<TBridgeValue<TBSAccount<TBSBridgeName>>>) {
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

  get #tokenToReceive(): TBridgeValue<TBridgeToken<TBSBridgeName>> {
    return this.#internalTokenToReceive
  }
  set #tokenToReceive(value: Partial<TBridgeValue<TBridgeToken<TBSBridgeName>>>) {
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

  get #tokenToUseBalance(): TBridgeValue<TBalanceResponse | undefined> {
    return this.#internalTokenToUseBalance
  }
  set #tokenToUseBalance(value: Partial<TBridgeValue<TBalanceResponse>>) {
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
      value: [this.fromService.neo3NeoXBridgeService.gasToken, this.fromService.neo3NeoXBridgeService.neoToken],
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

  async setTokenToUse(token: TBridgeToken<TBSBridgeName> | null): Promise<void> {
    let tokenToReceive: TBridgeToken<TBSBridgeName> | undefined

    try {
      if (!this.#availableTokensToUse.value) throw new BSError('No available tokens to use', 'NO_AVAILABLE_TOKENS')

      if (token) {
        if (this.#tokenToUse.value && this.fromService.tokenService.predicate(this.#tokenToUse.value, token)) return

        if (
          !this.#availableTokensToUse.value.some(currentToken =>
            this.fromService.tokenService.predicate(token, currentToken)
          )
        )
          throw new BSError('You are trying to use a token that is not available', 'TOKEN_NOT_AVAILABLE')

        const isGasToken = this.fromService.tokenService.predicateByHash(
          token,
          this.fromService.neo3NeoXBridgeService.gasToken
        )
        tokenToReceive = isGasToken
          ? this.toService.neo3NeoXBridgeService.gasToken
          : this.toService.neo3NeoXBridgeService.neoToken
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

  async setAccountToUse(account: TBSAccount<TBSBridgeName> | null): Promise<void> {
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

  async setBalances(balances: TBalanceResponse[] | null): Promise<void> {
    this.#balances = balances

    const tokenToUseBalance =
      this.#tokenToUse.value && balances
        ? balances?.find(item => this.fromService.tokenService.predicateByHash(this.#tokenToUse.value!, item.token))
        : null

    this.#tokenToUseBalance = {
      value: tokenToUseBalance,
    }

    this.#feeTokenBalance = balances
      ? balances?.find(item => this.fromService.tokenService.predicateByHash(this.fromService.feeToken, item.token))
      : null

    if (tokenToUseBalance === null || !this.#tokenToUse.value) {
      return
    }

    this.#amountToUseMax = { loading: true, error: null }
    this.#amountToUseMin = { loading: true, error: null }
    this.#bridgeFee = { loading: true, error: null }

    try {
      const neo3NeoXBridgeService = this.fromService.neo3NeoXBridgeService as INeo3NeoXBridgeService<TBSBridgeName>
      const constants = await neo3NeoXBridgeService.getBridgeConstants(this.#tokenToUse.value)
      this.#amountToUseMin = { value: constants.bridgeMinAmount }
      this.#bridgeFee = { value: constants.bridgeFee }

      const bridgeMaxAmountBn = new BSBigHumanAmount(constants.bridgeMaxAmount)
      const tokenBalanceAmountBn = new BSBigHumanAmount(tokenToUseBalance?.amount)

      const isFeeToken = this.fromService.tokenService.predicateByHash(
        this.fromService.feeToken,
        this.#tokenToUse.value
      )

      const maxTokenBalanceAmountBn = isFeeToken
        ? tokenBalanceAmountBn.minus(constants.bridgeFee)
        : tokenBalanceAmountBn

      const amountToUseMax = new BSBigHumanAmount(
        BSBigNumber.max(0, BSBigNumber.min(bridgeMaxAmountBn, maxTokenBalanceAmountBn)),
        this.#tokenToUse.value.decimals
      ).toFormatted()

      this.#amountToUseMax = { value: amountToUseMax }
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
      this.#amountToUse = { valid: null, loading: false, error: null }
      this.#amountToReceive = { value: null, loading: false, error: null }
      return
    }

    if (this.#amountToUseTimeout !== null) clearTimeout(this.#amountToUseTimeout)

    this.#amountToUseTimeout = setTimeout(async () => {
      if (!this.#tokenToUse.value) return

      const amountToUseBn = new BSBigHumanAmount(amount, this.#tokenToUse.value.decimals)
      const formattedAmount = amountToUseBn.toFormatted()
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

        if (amountToUseBn.isLessThan(this.#amountToUseMin.value)) {
          throw new BSError('Amount is below the minimum', 'AMOUNT_BELOW_MINIMUM')
        }

        if (amountToUseBn.isGreaterThan(this.#amountToUseMax.value)) {
          throw new BSError('Amount is above the maximum', 'AMOUNT_ABOVE_MAXIMUM')
        }

        const neo3NeoXBridgeService = this.fromService.neo3NeoXBridgeService as INeo3NeoXBridgeService<TBSBridgeName>

        const approvalFee = await neo3NeoXBridgeService
          .getApprovalFee({
            account: this.#accountToUse.value,
            token: this.#tokenToUse.value,
            amount: formattedAmount,
          })
          .then(fee => fee)
          .catch(() => '0')

        const newBridgeFeeBn = new BSBigHumanAmount(this.#bridgeFee.value, this.fromService.feeToken.decimals).plus(
          approvalFee
        )

        this.#bridgeFee = { value: newBridgeFeeBn.toFormatted() }

        const isFeeToken = this.fromService.tokenService.predicateByHash(
          this.fromService.feeToken,
          this.#tokenToUse.value
        )

        if (newBridgeFeeBn.plus(isFeeToken ? amountToUseBn : 0).isGreaterThan(this.#feeTokenBalance?.amount ?? 0)) {
          throw new BSError(
            'You do not have enough fee token balance to cover the bridge fee',
            'INSUFFICIENT_FEE_TOKEN_BALANCE'
          )
        }

        this.#amountToUse = { valid: true, error: null }
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

    const neo3NeoXBridgeService = this.fromService.neo3NeoXBridgeService as INeo3NeoXBridgeService<TBSBridgeName>

    return await neo3NeoXBridgeService.bridge({
      account: this.#accountToUse.value,
      token: this.#tokenToUse.value,
      amount: this.#amountToUse.value,
      receiverAddress: this.#addressToReceive.value,
      bridgeFee: this.#bridgeFee.value,
    })
  }

  static async wait({
    tokenToUse,
    tokenToReceive,
    transactionHash,
    neo3Service,
    neoXService,
  }: TNeo3NeoXBridgeOrchestratorWaitParams) {
    const isNeo3Service = tokenToUse.blockchain === neo3Service.name

    const fromService = isNeo3Service ? neo3Service : neoXService
    const toService = isNeo3Service ? neoXService : neo3Service

    const fromNeo3NeoXBridgeService = fromService.neo3NeoXBridgeService as INeo3NeoXBridgeService<TBSBridgeName>
    const toNeo3NeoXBridgeService = toService.neo3NeoXBridgeService as INeo3NeoXBridgeService<TBSBridgeName>

    const nonce = await BSUtilsHelper.retry(
      () =>
        fromNeo3NeoXBridgeService.getNonce({
          token: tokenToUse,
          transactionHash,
        }),
      {
        retries: 10,
        delay: 30000,
      }
    )

    await BSUtilsHelper.retry(
      () => toNeo3NeoXBridgeService.getTransactionHashByNonce({ nonce, token: tokenToReceive }),
      {
        retries: 10,
        delay: 30000,
      }
    )
  }
}
