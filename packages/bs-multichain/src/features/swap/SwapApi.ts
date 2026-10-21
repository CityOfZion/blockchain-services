import axios, { type AxiosInstance } from 'axios'
import { BSCommonConstants, BSError } from '@cityofzion/blockchain-service'
import type {
  TSwapApiAssetRef,
  TSwapApiCreateOrderParams,
  TSwapApiCreateQuotesParams,
  TSwapApiCreateQuotesResponse,
  TSwapApiCreateQuotesResult,
  TSwapApiGetDestinationsResponse,
  TSwapApiGetOrdersByAddressParams,
  TSwapApiOrder,
  TSwapApiOrderSummary,
  TSwapApiQuote,
  TSwapApiReportStepTransactionParams,
  TSwapQuote,
  TSwapToken,
} from './types'
import { SwapHelper } from './SwapHelper'
import type { BSAggregator } from '../../BSAggregator'
import { v4 as uuidv4 } from 'uuid'

const ERROR_CODE_BY_MESSAGE: [RegExp, string][] = [
  [/below the minimum/i, 'AMOUNT_BELOW_MINIMUM'],
  [/exceeds the maximum/i, 'AMOUNT_ABOVE_MAXIMUM'],
  [/quote expired/i, 'QUOTE_EXPIRED'],
  [/unsupported pair|does not support this pair/i, 'UNSUPPORTED_PAIR'],
  [/no providers available/i, 'NO_PROVIDERS_AVAILABLE'],
  [/no routes returned/i, 'NO_QUOTES_AVAILABLE'],
  [/tx hash already reported/i, 'DUPLICATE_TX_HASH'],
  [/not found/i, 'NOT_FOUND'],
]

// e.g. "amount below minimum: 1 is below the minimum of 13.26 for this pair"
const ERROR_METADATA_EXTRACTOR_BY_CODE: Record<string, (message: string) => Record<string, unknown> | undefined> = {
  AMOUNT_BELOW_MINIMUM: message => {
    const minAmount = message.match(/minimum of\s+([\d.]+)/i)?.[1]
    return minAmount ? { minAmount } : undefined
  },
  AMOUNT_ABOVE_MAXIMUM: message => {
    const maxAmount = message.match(/maximum of\s+([\d.]+)/i)?.[1]
    return maxAmount ? { maxAmount } : undefined
  },
}

export class SwapApi {
  // Sent as the X-Correlation-Id header so the backend can tie every request of a swap session together
  readonly correlationId: string

  #apiInstance?: AxiosInstance
  #destinationsByTokenId: Map<string, TSwapApiAssetRef[]> = new Map()

  constructor(correlationId?: string) {
    this.correlationId = correlationId || uuidv4()
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = axios.create({
        // TODO: change to BSCommonConstants.COZ_API_URL
        baseURL: `${BSCommonConstants.COZ_API_STAGE_URL}/v2/p/swap`,
        headers: { 'X-Correlation-Id': this.correlationId },
      })
    }

    return this.#apiInstance
  }

  #treatError(error: unknown): never {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      const message: string = error.response.data.message
      const code = ERROR_CODE_BY_MESSAGE.find(([regex]) => regex.test(message))?.[1] || 'SWAP_API_ERROR'
      const metadata = ERROR_METADATA_EXTRACTOR_BY_CODE[code]?.(message)

      throw new BSError(message, code, error, metadata)
    }

    throw error
  }

  #getQuoteFromApiQuote(quote: TSwapApiQuote): TSwapQuote {
    return {
      id: quote.quoteId,
      provider: quote.provider,
      executionFamily: quote.executionFamily,
      executionMode: quote.executionMode,
      amountToUse: quote.fromAmount,
      amountToReceive: quote.toAmountEstimated,
      amountToReceiveMin: quote.toAmountMin,
      expiresAt: quote.expiresAt,
      fees: quote.fees || [],
    }
  }

  async fetchDestinations(tokenToUse: TSwapToken, bsAggregator: BSAggregator): Promise<TSwapToken[]> {
    const asset = SwapHelper.buildAssetRef(tokenToUse)
    const id = SwapHelper.buildTokenId(asset)

    let destinations = this.#destinationsByTokenId.get(id)

    if (!destinations) {
      try {
        const { data } = await this.#api.get<TSwapApiGetDestinationsResponse>('/destinations', {
          params: { fromChain: asset.chain, fromAsset: asset.assetId },
        })

        destinations = data.destinations || []
        this.#destinationsByTokenId.set(id, destinations)
      } catch (error) {
        this.#treatError(error)
      }
    }

    return destinations.map(destination => SwapHelper.convertAssetRefToSwapToken(destination, bsAggregator))
  }

  async createQuotes({
    tokenToUse,
    tokenToReceive,
    amount,
    sourceAddress,
    addressToReceive,
    extraId,
    refundAddress,
    provider,
  }: TSwapApiCreateQuotesParams): Promise<TSwapApiCreateQuotesResult> {
    try {
      const { data } = await this.#api.post<TSwapApiCreateQuotesResponse>('/quotes', {
        from: { ...SwapHelper.buildAssetRef(tokenToUse), amount },
        to: SwapHelper.buildAssetRef(tokenToReceive),
        source: { address: sourceAddress },
        destination: { address: addressToReceive, tag: extraId?.trim() || undefined },
        refund: { address: refundAddress },
        selection: provider ? { mode: 'manual', preferredProvider: provider } : { mode: 'auto' },
        rateMode: 'floating',
      })

      return {
        quotes: (data.quotes || []).map(quote => this.#getQuoteFromApiQuote(quote)),
        recommendedQuoteId: data.recommendedQuoteId,
      }
    } catch (error) {
      this.#treatError(error)
    }
  }

  async createOrder({
    quoteId,
    sourceAddress,
    addressToReceive,
    extraId,
    refundAddress,
  }: TSwapApiCreateOrderParams): Promise<TSwapApiOrder> {
    try {
      const { data } = await this.#api.post<TSwapApiOrder>('/orders', {
        quoteId,
        source: { address: sourceAddress },
        destination: { address: addressToReceive, tag: extraId?.trim() || undefined },
        refund: { address: refundAddress },
      })

      return data
    } catch (error) {
      this.#treatError(error)
    }
  }

  async getOrder(orderId: string): Promise<TSwapApiOrder> {
    try {
      const { data } = await this.#api.get<TSwapApiOrder>(`/orders/${orderId}`, { params: { refresh: true } })

      return data
    } catch (error) {
      this.#treatError(error)
    }
  }

  // TODO: the GET /orders/addresses/:accountAddress endpoint is not deployed yet, so it returns mocked data for now.

  async getOrdersByAddress({
    address,
    limit,
    offset,
  }: TSwapApiGetOrdersByAddressParams): Promise<TSwapApiOrderSummary[]> {
    // TODO: Replace the mock with:
    // const { data } = await this.#api.get<TSwapApiGetOrdersByAddressResponse>(`/orders/addresses/${address}`, { params: { limit, offset } })
    // return data.orders || []
    const orders: TSwapApiOrderSummary[] = [
      { orderId: `mock-order-3-${address}`, sourceTxHash: null },
      { orderId: `mock-order-2-${address}`, sourceTxHash: `0x${'b'.repeat(64)}` },
      { orderId: `mock-order-1-${address}`, sourceTxHash: `0x${'a'.repeat(64)}` },
    ]

    const start = offset ?? 0

    return orders.slice(start, start + (limit ?? 50))
  }

  async reportStepTransaction({
    orderId,
    stepId,
    txHash,
    chainId,
  }: TSwapApiReportStepTransactionParams): Promise<TSwapApiOrder> {
    try {
      const { data } = await this.#api.post<TSwapApiOrder>(`/orders/${orderId}/steps/${stepId}/transaction`, {
        txHash,
        chainId,
      })

      return data
    } catch (error) {
      this.#treatError(error)
    }
  }
}
