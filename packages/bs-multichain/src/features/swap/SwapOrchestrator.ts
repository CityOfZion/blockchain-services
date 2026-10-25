import {
  BSBigHumanAmount,
  BSError,
  BSStringHelper,
  BSUtilsHelper,
  type TBSAccount,
  type TBalanceResponse,
  type TTransaction,
  isCalculableFee,
} from '@cityofzion/blockchain-service'
import { SwapApi } from './SwapApi'
import { SwapHelper } from './SwapHelper'

import type { BSEthereum } from '@cityofzion/bs-ethereum'
import type { BSAggregator } from '../../BSAggregator'
import { RTKOrchestrator } from '../../RTKOrchestrator'
import type { TBSServiceName, TOrchestratorStateAbleToPerform } from '../../types'
import type {
  ISwapOrchestrator,
  ISwapOrchestratorConstructor,
  TSwapApiExecutionStep,
  TSwapApiGetOrdersByAddressParams,
  TSwapApiOrder,
  TSwapApiOrderStatus,
  TSwapApiOrderSummary,
  TSwapOrchestratorState,
  TSwapQuote,
  TSwapResult,
  TSwapStatus,
  TSwapToken,
  TSwapTokenToUse,
} from './types'

const STATUS_BY_ORDER_STATUS: Record<TSwapApiOrderStatus, TSwapStatus> = {
  quote_only: 'confirming',
  created: 'confirming',
  awaiting_user_action: 'confirming',
  awaiting_approval: 'confirming',
  awaiting_deposit: 'confirming',
  source_tx_pending: 'confirming',
  source_tx_confirmed: 'confirming',
  provider_processing: 'exchanging',
  bridging: 'exchanging',
  destination_executing: 'exchanging',
  manual_review: 'exchanging',
  completed: 'finished',
  failed: 'failed',
  expired: 'failed',
  refunded: 'refunded',
}

// Quotes are refreshed before creating the order when they are about to expire
const QUOTE_EXPIRATION_MARGIN_IN_MS = 5000

export class SwapOrchestratorClass extends RTKOrchestrator<TSwapOrchestratorState> implements ISwapOrchestrator {
  #api: SwapApi
  #bsAggregator: BSAggregator

  #formatAmountTimeout: NodeJS.Timeout | null = null
  #formatAddressTimeout: NodeJS.Timeout | null = null
  #quoteRequestCount = 0
  #createdOrder: {
    order: TSwapApiOrder
    state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>
    result: TSwapResult
  } | null = null

  constructor(bsAggregator: BSAggregator) {
    super({
      availableTokensToUse: { loading: false, value: null, error: null, valid: null, validating: false },
      tokenToUse: { value: null, error: null, validating: false, valid: null },
      availableTokensToReceive: { loading: false, value: null, error: null, validating: false, valid: null },
      tokenToReceive: { value: null, error: null, validating: false, valid: null },
      accountToUse: { value: null, error: null, validating: false, valid: null },
      accountToUseBalances: { value: null },
      amountToUse: { value: null, formatted: null, formatting: false, error: null, validating: false, valid: null },
      addressToReceive: {
        value: null,
        formatted: null,
        formatting: false,
        error: null,
        validating: false,
        valid: null,
      },
      extraId: { value: null },
      quote: { value: null, error: null, loading: false, validating: false, valid: null },
      fee: { value: null, error: null, loading: false, validating: false, valid: null },
    })

    this.#bsAggregator = bsAggregator
    this.#api = new SwapApi()

    this.#subscribeToSetAvailableTokensToUse()
    this.#subscribeToValidateTokenToUse()
    this.#subscribeToSetAvailableTokenToReceive()
    this.#subscribeToValidateTokenReceive()
    this.#subscribeToFormatAmount()
    this.#subscribeToValidateAmount()
    this.#subscribeToFormatAddress()
    this.#subscribeToValidateAddress()
    this.#subscribeToSetQuote()
    this.#subscribeToSetFee()
    this.#subscribeToValidateFee()
  }

  #subscribeToSetAvailableTokensToUse() {
    this._subscribe(
      state => ({ accountToUse: state.accountToUse.value, accountToUseBalances: state.accountToUseBalances.value }),
      async ({ accountToUse, accountToUseBalances }) => {
        if (accountToUse === null || accountToUseBalances === null) {
          this._setState({ availableTokensToUse: { value: null, error: null, loading: false, valid: null } })
          return
        }

        try {
          const tokens = accountToUseBalances
            .filter(balance => new BSBigHumanAmount(balance.amount).isGreaterThan(0))
            .map(balance => SwapHelper.convertToSwapToken(accountToUse.blockchain, balance.token, this.#bsAggregator))
            .filter((token): token is TSwapTokenToUse => !!token)

          this._setState({ availableTokensToUse: { value: tokens, error: null, loading: false, valid: true } })
        } catch (error) {
          this._setState({
            availableTokensToUse: { value: null, error: this._treatError(error), loading: false, valid: false },
          })
        }
      }
    )
  }

  #subscribeToValidateTokenToUse() {
    this._subscribe(
      state => ({ tokenToUse: state.tokenToUse.value, availableTokensToUse: state.availableTokensToUse.value }),
      async ({ tokenToUse, availableTokensToUse }) => {
        if (tokenToUse === null) return

        const isValid = !!availableTokensToUse?.some(token => token.id === tokenToUse.id)
        if (isValid) return

        this._setState({ tokenToUse: { value: null, error: null, valid: null, validating: false } })
      }
    )
  }

  #subscribeToSetAvailableTokenToReceive() {
    this._subscribe(
      state => ({ tokenToUse: state.tokenToUse.value }),
      async ({ tokenToUse }) => {
        if (tokenToUse === null) {
          this._setState({
            availableTokensToReceive: { value: null, error: null, loading: false, valid: null },
          })
          return
        }

        try {
          this._setState({ availableTokensToReceive: { loading: true, error: null, valid: null } })

          const tokens = await this.#api.fetchDestinations(tokenToUse, this.#bsAggregator)

          this._setState({ availableTokensToReceive: { loading: false, value: tokens, valid: true } })
        } catch (error: any) {
          this._setState({
            availableTokensToReceive: { loading: false, value: null, error: this._treatError(error), valid: false },
          })
        }
      }
    )
  }

  #subscribeToValidateTokenReceive() {
    this._subscribe(
      state => ({
        tokenToReceive: state.tokenToReceive.value,
        availableTokenToReceive: state.availableTokensToReceive.value,
      }),
      async ({ tokenToReceive, availableTokenToReceive }) => {
        if (tokenToReceive === null) return

        const isValid = !!availableTokenToReceive?.some(token => token.id === tokenToReceive.id)
        if (isValid) return

        this._setState({ tokenToReceive: { value: null, error: null, valid: null, validating: false } })
      }
    )
  }

  #subscribeToFormatAmount() {
    this._subscribe(
      state => ({ amountToUse: state.amountToUse.value, tokenToUse: state.tokenToUse.value }),
      async ({ amountToUse, tokenToUse }) => {
        if (this.#formatAmountTimeout) {
          clearTimeout(this.#formatAmountTimeout)
        }

        if (amountToUse === null || tokenToUse === null) {
          this._setState({ amountToUse: { formatting: false, formatted: null } })
          return
        }

        this._setState({ amountToUse: { formatting: true, formatted: null } })

        this.#formatAmountTimeout = setTimeout(() => {
          const formatted = new BSBigHumanAmount(amountToUse, tokenToUse.decimals).toFormatted()
          this._setState({
            amountToUse: {
              formatted,
              value: formatted,
              formatting: false,
            },
          })
        }, 1500)
      }
    )
  }

  #subscribeToValidateAmount() {
    this._subscribe(
      state => ({
        amountToUse: state.amountToUse.formatted,
        tokenToUse: state.tokenToUse.value,
        accountToUseBalances: state.accountToUseBalances.value,
      }),
      async ({ amountToUse, tokenToUse, accountToUseBalances }) => {
        if (amountToUse === null || accountToUseBalances === null || tokenToUse === null) {
          this._setState({ amountToUse: { valid: null, validating: false, error: null } })
          return
        }

        this._setState({ amountToUse: { validating: true, error: null, valid: null } })

        try {
          const amountBn = new BSBigHumanAmount(amountToUse)

          if (amountBn.isLessThanOrEqualTo(0)) {
            throw new BSError('Amount must be greater than zero', 'AMOUNT_BELOW_ZERO')
          }

          const tokenToUseBalance = accountToUseBalances.find(item => tokenToUse.hash === item.token.hash)

          if (!tokenToUseBalance || amountBn.isGreaterThan(tokenToUseBalance.amount)) {
            throw new BSError('Amount exceeds balance', 'AMOUNT_EXCEEDS_BALANCE')
          }

          this._setState({ amountToUse: { error: null, valid: true, validating: false } })
        } catch (error) {
          this._setState({ amountToUse: { error: this._treatError(error), valid: false, validating: false } })
        }
      }
    )
  }

  #subscribeToFormatAddress() {
    this._subscribe(
      state => ({ addressToReceive: state.addressToReceive.value, tokenToReceive: state.tokenToReceive.value }),
      async ({ addressToReceive, tokenToReceive }) => {
        if (this.#formatAddressTimeout) {
          clearTimeout(this.#formatAddressTimeout)
        }

        if (addressToReceive === null || tokenToReceive === null) {
          this._setState({ addressToReceive: { formatting: false, formatted: null } })
          return
        }

        this._setState({ addressToReceive: { formatting: true, formatted: null } })

        this.#formatAddressTimeout = setTimeout(() => {
          const fixedAddress = BSStringHelper.removeSpecialCharacters(addressToReceive, { allowSpaces: false })
          this._setState({ addressToReceive: { formatting: false, formatted: fixedAddress, value: fixedAddress } })
        }, 1500)
      }
    )
  }

  #subscribeToValidateAddress() {
    this._subscribe(
      state => ({ addressToReceive: state.addressToReceive.formatted, tokenToReceive: state.tokenToReceive.value }),
      async ({ addressToReceive, tokenToReceive }) => {
        if (addressToReceive === null || tokenToReceive === null) {
          this._setState({ addressToReceive: { valid: null, validating: false, error: null } })
          return
        }

        this._setState({ addressToReceive: { validating: true, error: null, valid: null } })

        // The swap backend doesn't expose address validation rules, so it is only possible to validate addresses of known blockchains
        const service = tokenToReceive.blockchain
          ? this.#bsAggregator.blockchainServicesByNameRecord[tokenToReceive.blockchain]
          : undefined

        const isValid = service ? service.validateAddress(addressToReceive) : addressToReceive.length > 0

        this._setState({
          addressToReceive: {
            valid: isValid,
            error: isValid ? null : new BSError('Invalid address format', 'INVALID_ADDRESS_FORMAT'),
            validating: false,
          },
        })
      }
    )
  }

  #subscribeToSetQuote() {
    this._subscribe(
      state => ({
        tokenToUse: state.tokenToUse.value,
        tokenToReceive: state.tokenToReceive.value,
        amountToUse: state.amountToUse.formatted,
        accountToUse: state.accountToUse.value,
        addressToReceive: state.addressToReceive.formatted,
        addressToReceiveValid: state.addressToReceive.valid,
      }),
      async ({ tokenToUse, tokenToReceive, amountToUse, accountToUse, addressToReceive, addressToReceiveValid }) => {
        const requestId = ++this.#quoteRequestCount

        if (
          tokenToUse === null ||
          tokenToReceive === null ||
          amountToUse === null ||
          accountToUse === null ||
          addressToReceive === null ||
          addressToReceiveValid !== true
        ) {
          this._setState({
            quote: { value: null, loading: false, error: null, valid: null, validating: false },
          })
          return
        }

        this._setState({
          quote: { loading: true, error: null, valid: null, validating: false },
        })

        try {
          const { quotes, recommendedQuoteId } = await this.#api.createQuotes({
            tokenToUse,
            tokenToReceive,
            amount: amountToUse,
            sourceAddress: accountToUse.address,
            addressToReceive,
            refundAddress: accountToUse.address,
          })

          if (requestId !== this.#quoteRequestCount) return

          const quote = quotes.find(item => item.id === recommendedQuoteId) || quotes[0]
          if (!quote) throw new BSError('No quotes available', 'NO_QUOTES_AVAILABLE')

          this._setState({
            quote: { value: quote, loading: false, error: null, valid: true, validating: false },
          })
        } catch (error) {
          if (requestId !== this.#quoteRequestCount) return

          const treatedError = this._treatError(error)

          this._setState({
            quote: { value: null, loading: false, error: treatedError, valid: false, validating: false },
          })
        }
      }
    )
  }

  #subscribeToSetFee() {
    this._subscribe(
      state => ({
        tokenToUse: state.tokenToUse.value,
        tokenToReceive: state.tokenToReceive.value,
        amountToUse: state.amountToUse.formatted,
        accountToUse: state.accountToUse.value,
        addressToReceive: state.addressToReceive.value,
        accountToUseBalances: state.accountToUseBalances.value,
      }),
      async ({ accountToUse, amountToUse, tokenToReceive, tokenToUse, addressToReceive, accountToUseBalances }) => {
        try {
          if (
            tokenToUse === null ||
            tokenToReceive === null ||
            amountToUse === null ||
            accountToUse === null ||
            addressToReceive === null ||
            accountToUseBalances === null
          ) {
            this._setState({ fee: { value: null, error: null, loading: false, valid: null, validating: false } })
            return
          }

          this._setState({ fee: { loading: true, error: null, valid: null, validating: false } })

          let fee = '0'

          const service = this.#bsAggregator.blockchainServicesByNameRecord[tokenToUse.blockchain]!

          // The exact transaction is only known after the order is created, so the fee is estimated as a transfer
          if (isCalculableFee(service)) {
            fee = await service.calculateTransferFee({
              senderAccount: accountToUse,
              intents: [
                {
                  amount: amountToUse,
                  receiverAddress:
                    tokenToReceive.blockchain === tokenToUse.blockchain ? addressToReceive : accountToUse.address,
                  token: {
                    decimals: tokenToUse.decimals,
                    hash: tokenToUse.hash,
                    name: tokenToUse.name,
                    symbol: tokenToUse.symbol,
                  },
                },
              ],
            })
          }

          this._setState({ fee: { value: fee, loading: false, error: null, valid: true, validating: false } })
        } catch (error) {
          this._setState({
            fee: {
              loading: false,
              error: new BSError('Failed to calculate fee', 'FEE_CALCULATION_FAILED', error),
              valid: false,
              validating: false,
              value: null,
            },
          })
        }
      }
    )
  }

  #subscribeToValidateFee() {
    this._subscribe(
      state => ({
        tokenToUse: state.tokenToUse.value,
        amountToUse: state.amountToUse.value,
        accountToUseBalances: state.accountToUseBalances.value,
        fee: state.fee.value,
      }),
      async ({ amountToUse, tokenToUse, accountToUseBalances, fee }) => {
        try {
          if (tokenToUse === null || amountToUse === null || accountToUseBalances === null || fee === null) {
            this._setState({ fee: { error: null, validating: false, valid: null } })
            return
          }

          this._setState({ fee: { validating: true, error: null, valid: null } })

          let totalFeeAmount = new BSBigHumanAmount(fee)

          const service = this.#bsAggregator.blockchainServicesByName[tokenToUse.blockchain]!

          const isFeeToken = service.tokenService.predicateByHash(service.feeToken, tokenToUse.hash)

          if (isFeeToken) {
            totalFeeAmount = totalFeeAmount.plus(amountToUse)
          }

          const feeTokenBalance = accountToUseBalances.find(item =>
            service.tokenService.predicateByHash(item.token, service.feeToken)
          )

          if (!feeTokenBalance || totalFeeAmount.isGreaterThan(feeTokenBalance.amount)) {
            throw new BSError('Fee exceeds balance', 'FEE_EXCEEDS_BALANCE')
          }

          this._setState({ fee: { value: fee, loading: false, error: null, valid: true, validating: false } })
        } catch (error) {
          this._setState({
            fee: { loading: false, error: this._treatError(error), valid: false, validating: false },
          })
        }
      }
    )
  }

  async setAccountToUse(account: TBSAccount<TBSServiceName> | null) {
    try {
      if (account && !SwapHelper.isBlockchainSupported(account.blockchain, this.#bsAggregator)) {
        throw new BSError(
          'You are trying to use an account from a blockchain that is not supported by the swap',
          'ACCOUNT_BLOCKCHAIN_NOT_SUPPORTED'
        )
      }

      this._setState({
        accountToUse: { value: account, valid: true, error: null, validating: false },
        accountToUseBalances: { value: null },
      })
    } catch (error) {
      this._setState({
        accountToUse: { value: null, error: this._treatError(error), valid: false, validating: false },
        accountToUseBalances: { value: null },
      })
    }
  }

  async setAccountToUseBalances(accountToUseBalances: TBalanceResponse[] | null) {
    this._setState({ accountToUseBalances: { value: accountToUseBalances } })
  }

  async setTokenToUse(token: TSwapTokenToUse | null) {
    try {
      const { availableTokensToUse } = this._getState()

      if (availableTokensToUse.value === null) throw new BSError('No available tokens to use', 'NO_AVAILABLE_TOKENS')

      if (token) {
        if (!availableTokensToUse.value.some(currentToken => token.id === currentToken.id)) {
          throw new BSError('You are trying to use a token that is not available', 'TOKEN_NOT_AVAILABLE')
        }
      }

      this._setState({ tokenToUse: { value: token, valid: true, error: null, validating: false } })
    } catch (error) {
      this._setState({ tokenToUse: { value: null, error: this._treatError(error), valid: false, validating: false } })
    }
  }

  async setTokenToReceive(token: TSwapToken | null) {
    try {
      const { availableTokensToReceive } = this._getState()

      if (availableTokensToReceive.value === null)
        throw new BSError('No available tokens to receive', 'NO_AVAILABLE_TOKENS')

      if (token) {
        if (!availableTokensToReceive.value.some(currentToken => token.id === currentToken.id)) {
          throw new BSError('You are trying to use a token that is not available', 'TOKEN_NOT_AVAILABLE')
        }
      }

      this._setState({ tokenToReceive: { value: token, error: null, valid: true, validating: false } })
    } catch (error) {
      this._setState({
        tokenToReceive: { value: null, error: this._treatError(error), valid: false, validating: false },
      })
    }
  }

  async setAmountToUse(amount: string | null) {
    this._setState({
      amountToUse: { value: amount, formatted: null, formatting: false, error: null, valid: null, validating: false },
    })
  }

  async setAddressToReceive(address: string | null) {
    this._setState({
      addressToReceive: {
        value: address,
        error: null,
        valid: null,
        validating: false,
        formatted: null,
        formatting: false,
      },
    })
  }

  async setExtraId(extraId: string | null): Promise<void> {
    this._setState({ extraId: { value: extraId } })
  }

  isAbleToSwap(): boolean {
    const state = this._getState()

    return (
      state.tokenToUse.value !== null &&
      state.tokenToUse.error === null &&
      state.tokenToUse.valid === true &&
      state.tokenToUse.validating === false &&
      state.tokenToReceive.value !== null &&
      state.tokenToReceive.error === null &&
      state.tokenToReceive.valid === true &&
      state.tokenToReceive.validating === false &&
      state.accountToUse.value !== null &&
      state.accountToUse.error === null &&
      state.accountToUse.valid === true &&
      state.accountToUse.validating === false &&
      state.accountToUseBalances.value !== null &&
      state.addressToReceive.value !== null &&
      state.addressToReceive.valid === true &&
      state.addressToReceive.validating === false &&
      state.addressToReceive.error === null &&
      state.addressToReceive.formatting === false &&
      state.addressToReceive.formatted !== null &&
      state.amountToUse.value !== null &&
      state.amountToUse.error === null &&
      state.amountToUse.valid === true &&
      state.amountToUse.formatting === false &&
      state.amountToUse.validating === false &&
      state.amountToUse.formatted !== null &&
      state.quote.value !== null &&
      state.quote.error === null &&
      state.quote.valid === true &&
      state.quote.loading === false &&
      state.quote.validating === false &&
      state.fee.value !== null &&
      state.fee.error === null &&
      state.fee.valid === true &&
      state.fee.loading === false &&
      state.fee.validating === false
    )
  }

  async #getValidQuote(state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>): Promise<TSwapQuote> {
    const quote = state.quote.value

    const isExpired =
      !!quote.expiresAt && new Date(quote.expiresAt).getTime() - QUOTE_EXPIRATION_MARGIN_IN_MS <= Date.now()

    if (!isExpired) return quote

    const { quotes, recommendedQuoteId } = await this.#api.createQuotes({
      tokenToUse: state.tokenToUse.value,
      tokenToReceive: state.tokenToReceive.value,
      amount: state.amountToUse.value,
      sourceAddress: state.accountToUse.value.address,
      addressToReceive: state.addressToReceive.value,
      refundAddress: state.accountToUse.value.address,
      provider: quote.provider,
    })

    const newQuote =
      quotes.find(item => item.id === recommendedQuoteId && item.executionFamily === quote.executionFamily) ||
      quotes.find(item => item.executionFamily === quote.executionFamily)

    if (!newQuote) throw new BSError('Quote expired and could not be refreshed', 'QUOTE_EXPIRED')

    return newQuote
  }

  async #executeSendToProviderStep(
    step: TSwapApiExecutionStep,
    state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>
  ) {
    if (!step?.sendInstruction) throw new BSError('Send instruction not found', 'SEND_INSTRUCTION_NOT_FOUND')

    const tokenToUse = state.tokenToUse.value
    const service = this.#bsAggregator.blockchainServicesByNameRecord[tokenToUse.blockchain]!

    const [transaction] = await service.transfer({
      senderAccount: state.accountToUse.value,
      intents: [
        {
          amount: step.sendInstruction.fromAmount,
          receiverAddress: step.sendInstruction.depositAddress,
          token: {
            decimals: tokenToUse.decimals,
            hash: tokenToUse.hash,
            name: tokenToUse.name,
            symbol: tokenToUse.symbol,
          },
        },
      ],
      memo: step.sendInstruction.memo || step.sendInstruction.extraId,
    })

    return { transaction }
  }

  // The transaction is already broadcasted at this point, so a reporting failure must not fail the swap
  async #reportStepTransaction(
    order: TSwapApiOrder,
    step: TSwapApiExecutionStep,
    txHash: string,
    chainId?: string
  ): Promise<TSwapApiOrder> {
    try {
      return await BSUtilsHelper.retry(
        () => this.#api.reportStepTransaction({ orderId: order.orderId, stepId: step.stepId, txHash, chainId }),
        { retries: 3, delay: 2000 }
      )
    } catch {
      return order
    }
  }

  async #executeDepositOrder(order: TSwapApiOrder, state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>) {
    const step = order.steps?.find(item => !!item.sendInstruction)
    if (!step) throw new BSError('Deposit step not found', 'DEPOSIT_STEP_NOT_FOUND')

    const { transaction } = await this.#executeSendToProviderStep(step, state)

    // Deposit order does not need to report the transaction hash.
    return { transaction }
  }

  async #executeRoutePayloadOrderInNonEVM(
    order: TSwapApiOrder,
    state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>
  ) {
    const sendToProviderStep = order.steps?.find(item => !!item.sendInstruction)

    if (!sendToProviderStep) {
      throw new BSError('Send step not found', 'DEPOSIT_STEP_NOT_FOUND')
    }

    const { transaction } = await this.#executeSendToProviderStep(sendToProviderStep, state)

    const updatedOrder = await this.#reportStepTransaction(order, sendToProviderStep, transaction.txId)

    return { transaction, updatedOrder }
  }

  #hasTransactionPayload(
    service: object
  ): service is Pick<BSEthereum<TBSServiceName>, 'sendTransactionPayload' | 'waitForTransactionConfirmation'> {
    return 'sendTransactionPayload' in service && 'waitForTransactionConfirmation' in service
  }

  async #executeRoutePayloadOrderInEVM(
    order: TSwapApiOrder,
    state: TOrchestratorStateAbleToPerform<TSwapOrchestratorState>
  ) {
    const tokenToUse = state.tokenToUse.value
    const service = this.#bsAggregator.blockchainServicesByNameRecord[tokenToUse.blockchain]!

    if (!this.#hasTransactionPayload(service)) {
      throw new BSError('Service does not support transaction payloads', 'SERVICE_DOES_NOT_SUPPORT_TRANSACTION_PAYLOAD')
    }

    // Approval is only present when the token needs an allowance (e.g. ERC20), native tokens do not need it
    const approvalStep = order.steps?.find(item => item.kind === 'approval')
    const sendStep = order.steps?.find(item => item.kind !== 'approval' && !!item.txPayload)

    if (!sendStep?.txPayload) {
      throw new BSError('Send step not found', 'SEND_STEP_NOT_FOUND')
    }

    let updatedOrder = order

    if (approvalStep) {
      if (!approvalStep.txPayload) {
        throw new BSError('Only ERC20 approval steps are supported', 'ERC20_APPROVAL_STEP_NOT_SUPPORTED')
      }

      const approvalTransaction = await service.sendTransactionPayload({
        senderAccount: state.accountToUse.value,
        payload: { ...approvalStep.txPayload, chainId: approvalStep.txPayload.chainId || approvalStep.chainId },
      })

      updatedOrder = await this.#reportStepTransaction(
        updatedOrder,
        approvalStep,
        approvalTransaction.txId,
        approvalStep.txPayload.chainId || approvalStep.chainId
      )

      // The send step spends the allowance, so it would revert or fail to estimate gas before the approval is mined
      await service.waitForTransactionConfirmation(approvalTransaction.txId)
    }

    const transaction = await service.sendTransactionPayload({
      senderAccount: state.accountToUse.value,
      payload: { ...sendStep.txPayload, chainId: sendStep.txPayload.chainId || sendStep.chainId },
    })

    updatedOrder = await this.#reportStepTransaction(
      updatedOrder,
      sendStep,
      transaction.txId,
      sendStep.txPayload.chainId || sendStep.chainId
    )

    return { transaction, updatedOrder }
  }

  async createOrder(): Promise<TSwapResult> {
    if (!this.isAbleToSwap()) {
      throw new BSError('Cannot perform swap, not all required information is valid', 'CANNOT_PERFORM_SWAP')
    }

    const state = this._getState() as TOrchestratorStateAbleToPerform<TSwapOrchestratorState>

    const quote = await this.#getValidQuote(state)

    const order = await this.#api.createOrder({
      quoteId: quote.id,
      sourceAddress: state.accountToUse.value.address,
      addressToReceive: state.addressToReceive.value,
      extraId: state.extraId.value,
      refundAddress: state.accountToUse.value.address,
    })

    const result: TSwapResult = {
      swapId: order.orderId,
      correlationId: this.#api.correlationId,
      txIdFrom: undefined,
      log: JSON.stringify(order),
      txIdTo: undefined,
      provider: quote.provider,
      status: 'confirming',
      addressFrom: state.accountToUse.value.address,
      addressTo: state.addressToReceive.value,
      extraIdTo: state.extraId.value?.trim() || undefined,
      amountFrom: state.amountToUse.value,
      amountTo: quote.amountToReceive,
      tokenFrom: state.tokenToUse.value,
      tokenTo: state.tokenToReceive.value,
      fee: state.fee.value,
    }

    // The state is kept as it was when the order was created, so later changes do not affect the execution
    this.#createdOrder = { order, state, result }

    return { ...result }
  }

  async executeOrder(): Promise<TSwapResult> {
    if (!this.#createdOrder) {
      throw new BSError('No order was created to be executed', 'ORDER_NOT_CREATED')
    }

    const { state } = this.#createdOrder
    let { order } = this.#createdOrder
    const result = { ...this.#createdOrder.result }

    // Cleared before executing so the same order is never executed twice
    this.#createdOrder = null

    try {
      if (!order.steps || order.steps.length === 0) {
        throw new BSError('The order has no steps to execute', 'SWAP_ORDER_WITHOUT_STEPS')
      }

      let transaction: TTransaction<TBSServiceName> | undefined

      if (order.executionFamily === 'deposit_order') {
        const result = await this.#executeDepositOrder(order, state)
        transaction = result.transaction
      } else {
        // Transaction payloads and signature requests are only returned for EVM source chains
        const isEVM = order.steps.some(step => !!step.txPayload || !!step.signatureRequest)

        const result = isEVM
          ? await this.#executeRoutePayloadOrderInEVM(order, state)
          : await this.#executeRoutePayloadOrderInNonEVM(order, state)

        order = result.updatedOrder
        transaction = result.transaction
      }

      result.txIdFrom = transaction.txId
      result.log = JSON.stringify(order)
    } catch (error) {
      result.status = 'failed'
      result.log = error instanceof Error ? error.message : result.log
    }

    return result
  }

  static async getOrder(id: string, bsAggregator: BSAggregator, correlationId?: string): Promise<TSwapResult> {
    const api = new SwapApi(correlationId)

    const response = await BSUtilsHelper.retry(
      async (): Promise<TSwapResult> => {
        const order = await api.getOrder(id)
        const destination = order.addresses.destination

        return {
          swapId: order.orderId,
          correlationId: api.correlationId,
          txIdFrom: order.support.sourceTxHash,
          txIdTo: order.support.destinationTxHash,
          provider: order.provider,
          status: STATUS_BY_ORDER_STATUS[order.status] || 'confirming',
          addressFrom: order.addresses.source?.address || '',
          tokenFrom: SwapHelper.convertAssetRefToSwapToken(order.from, bsAggregator),
          tokenTo: SwapHelper.convertAssetRefToSwapToken(order.to, bsAggregator),
          amountFrom: order.from.amount,
          amountTo: order.to.amountReceived || order.to.amountEstimated,
          addressTo: destination.address,
          extraIdTo: destination.tag || destination.memo,
          log: JSON.stringify(order),
        }
      },
      {
        retries: 10,
        delay: 30000,
      }
    )

    return response
  }

  static async getOrdersByAddress(
    params: TSwapApiGetOrdersByAddressParams,
    correlationId?: string
  ): Promise<TSwapApiOrderSummary[]> {
    const api = new SwapApi(correlationId)
    return await api.getOrdersByAddress(params)
  }
}

export const SwapOrchestrator: ISwapOrchestratorConstructor = SwapOrchestratorClass
