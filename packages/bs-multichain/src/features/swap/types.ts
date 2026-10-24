import type { TBalanceResponse, TBSAccount } from '@cityofzion/blockchain-service'
import type {
  TBSServiceName,
  TOrchestratorFormattableValue,
  TOrchestratorLoadableValue,
  TOrchestratorValidatableValue,
  TOrchestratorValue,
  TRequiredByKey,
} from '../../types'
import type { RTKOrchestrator } from '../../RTKOrchestrator'
import type { BSAggregator } from '../../BSAggregator'

export type TSwapProvider = 'simpleswap' | 'swapkit' | 'changenow' | 'changelly' | 'exolix' | 'lifi' | 'rango' | 'rubic'

export type TSwapExecutionFamily = 'deposit_order' | 'route_payload'

export type TSwapExecutionMode = 'deposit_address' | 'tx_payload' | 'multi_step'

export type TSwapToken = {
  id: string
  // Canonical chain identifier used by the swap backend (e.g. "neo3", "ethereum", "bitcoin")
  chain: string
  // Asset identifier used by the swap backend (e.g. "GASN3", "ETH", "USDC")
  assetId: string
  network?: string
  blockchain?: TBSServiceName
  imageUrl?: string
  symbol: string
  name: string
  hash?: string
  decimals?: number
  addressTemplateUrl?: string
  txTemplateUrl?: string
}

export type TSwapTokenToUse = TRequiredByKey<TSwapToken, 'decimals' | 'hash' | 'blockchain'>

export type TSwapQuoteFee = {
  code: string
  amount: string
  assetId?: string
  description?: string
}

export type TSwapQuote = {
  id: string
  provider: TSwapProvider
  executionFamily: TSwapExecutionFamily
  executionMode: TSwapExecutionMode
  amountToUse: string
  amountToReceive: string
  amountToReceiveMin?: string
  expiresAt?: string
  fees: TSwapQuoteFee[]
}

export type TSwapOrchestratorState = {
  availableTokensToUse: TOrchestratorValidatableValue<TOrchestratorLoadableValue<TOrchestratorValue<TSwapTokenToUse[]>>>
  tokenToUse: TOrchestratorValidatableValue<TOrchestratorValue<TSwapTokenToUse>>
  availableTokensToReceive: TOrchestratorValidatableValue<TOrchestratorLoadableValue<TOrchestratorValue<TSwapToken[]>>>
  tokenToReceive: TOrchestratorValidatableValue<TOrchestratorValue<TSwapToken>>
  accountToUseBalances: TOrchestratorValue<TBalanceResponse[]>
  accountToUse: TOrchestratorValidatableValue<TOrchestratorValue<TBSAccount<TBSServiceName>>>
  amountToUse: TOrchestratorFormattableValue<TOrchestratorValidatableValue<TOrchestratorValue<string>>>
  addressToReceive: TOrchestratorFormattableValue<TOrchestratorValidatableValue<TOrchestratorValue<string>>>
  // Optional destination tag / memo, the swap backend does not expose which tokens require it
  extraId: TOrchestratorValue<string>
  quote: TOrchestratorValidatableValue<TOrchestratorLoadableValue<TOrchestratorValue<TSwapQuote>>>
  fee: TOrchestratorValidatableValue<TOrchestratorLoadableValue<TOrchestratorValue<string>>>
}

export type TSwapStatus = 'finished' | 'confirming' | 'exchanging' | 'failed' | 'refunded'

export type TSwapResult = {
  swapId: string
  correlationId: string
  txIdTo?: string
  txIdFrom?: string
  provider: TSwapProvider
  status: TSwapStatus
  addressFrom: string
  tokenFrom: TSwapToken
  tokenTo: TSwapToken
  amountFrom: string
  amountTo: string
  addressTo: string
  extraIdTo?: string
  fee?: string
  log?: string
}

export interface ISwapOrchestrator extends RTKOrchestrator<TSwapOrchestratorState> {
  setTokenToUse(token: TSwapTokenToUse | null): Promise<void>
  setTokenToReceive(token: TSwapToken | null): Promise<void>
  setAccountToUseBalances(accountToUseBalances: TBalanceResponse[] | null): Promise<void>
  setAccountToUse(account: TBSAccount<TBSServiceName> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraId(extraId: string | null): Promise<void>
  isAbleToSwap(): boolean
  createOrder(): Promise<TSwapResult>
  executeOrder(): Promise<TSwapResult>
}

export interface ISwapOrchestratorConstructor {
  new (bsAggregator: BSAggregator): ISwapOrchestrator
  getOrder(id: string, bsAggregator: BSAggregator, correlationId?: string): Promise<TSwapResult>
  getOrdersByAddress(params: TSwapApiGetOrdersByAddressParams, correlationId?: string): Promise<TSwapApiOrderSummary[]>
}

// Swap API types

export type TSwapApiOrderStatus =
  | 'quote_only'
  | 'created'
  | 'awaiting_user_action'
  | 'awaiting_approval'
  | 'awaiting_deposit'
  | 'source_tx_pending'
  | 'source_tx_confirmed'
  | 'provider_processing'
  | 'bridging'
  | 'destination_executing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'expired'
  | 'manual_review'

export type TSwapApiAssetRef = {
  chain: string
  assetId: string
  network?: string
}

export type TSwapApiAmountRef = TSwapApiAssetRef & {
  amount: string
}

export type TSwapApiOrderTo = TSwapApiAssetRef & {
  amountEstimated: string
  amountMin?: string
  // Only present once the order is completed
  amountReceived?: string
}

export type TSwapApiAddressRef = {
  address: string
  tag?: string
  memo?: string
}

export type TSwapApiFeeLine = {
  code: string
  amount: string
  assetId?: string
  description?: string
}

export type TSwapApiQuote = {
  quoteId: string
  provider: TSwapProvider
  executionFamily: TSwapExecutionFamily
  executionMode: TSwapExecutionMode
  fromAmount: string
  toAmountEstimated: string
  toAmountMin?: string
  slippageBps?: number
  rateMode: 'floating' | 'fixed' | 'n/a'
  expiresAt?: string
  fees: TSwapApiFeeLine[] | null
}

export type TSwapApiTxPayload = {
  to: string
  data: string
  value?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  chainId?: string
}

export type TSwapApiSignatureRequest = {
  type: string
  domain: unknown
  types: unknown
  message: unknown
}

export type TSwapApiSendInstruction = {
  depositAddress: string
  extraId?: string
  memo?: string
  fromAmount: string
  fromAsset: TSwapApiAssetRef
  expiresAt?: string
  refundAddress?: string
}

export type TSwapApiExecutionStep = {
  stepId: string
  kind: 'approval' | 'swap' | 'bridge' | 'send_to_provider' | 'settle' | 'unknown'
  chainId?: string
  status: 'pending' | 'broadcasted'
  approvalMode?: 'none' | 'erc20_approve' | 'permit' | 'permit2' | 'unknown'
  txPayload?: TSwapApiTxPayload
  signatureRequest?: TSwapApiSignatureRequest
  sendInstruction?: TSwapApiSendInstruction
  sourceTxHash?: string
  providerStepRef?: string
}

export type TSwapApiSupportRefs = {
  swapId?: string
  correlationId: string
  providerQuoteReference?: string
  providerOrderReference?: string
  providerRouteReference?: string
  providerSupportReference?: string
  sourceTxHash?: string
  destinationTxHash?: string
  refundTxHash?: string
}

export type TSwapApiOrderAddresses = {
  source?: TSwapApiAddressRef
  destination: TSwapApiAddressRef
  refund?: TSwapApiAddressRef
}

export type TSwapApiOrder = {
  orderId: string
  quoteId: string
  provider: TSwapProvider
  executionFamily: TSwapExecutionFamily
  executionMode: TSwapExecutionMode
  from: TSwapApiAmountRef
  to: TSwapApiOrderTo
  addresses: TSwapApiOrderAddresses
  status: TSwapApiOrderStatus
  substatus?: string
  steps: TSwapApiExecutionStep[] | null
  support: TSwapApiSupportRefs
  actionRequired?: {
    type: string
    url?: string
    message: string
  }
}

export type TSwapApiGetDestinationsResponse = {
  destinations: TSwapApiAssetRef[]
}

export type TSwapApiCreateQuotesResponse = {
  quoteRequestId: string
  selectionMode: 'auto' | 'manual'
  quotes: TSwapApiQuote[]
  recommendedQuoteId?: string
}

export type TSwapApiCreateQuotesParams = {
  tokenToUse: TSwapToken
  tokenToReceive: TSwapToken
  amount: string
  sourceAddress: string
  addressToReceive: string
  extraId?: string | null
  refundAddress: string
  provider?: TSwapProvider
}

export type TSwapApiCreateQuotesResult = {
  quotes: TSwapQuote[]
  recommendedQuoteId?: string
}

export type TSwapApiCreateOrderParams = {
  quoteId: string
  sourceAddress: string
  addressToReceive: string
  extraId?: string | null
  refundAddress: string
}

export type TSwapApiReportStepTransactionParams = {
  orderId: string
  stepId: string
  txHash: string
  chainId?: string
}

export type TSwapApiOrderSummary = {
  orderId: string
  // Null until the swap transaction is reported via the step transaction endpoint
  sourceTxHash: string | null
}

export type TSwapApiGetOrdersByAddressResponse = {
  orders: TSwapApiOrderSummary[]
}

export type TSwapApiGetOrdersByAddressParams = {
  address: string
  limit?: number
  offset?: number
}
