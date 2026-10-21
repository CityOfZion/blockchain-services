import axios from 'axios'
import { BSCommonConstants, BSError } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'
import { BSAggregator } from '../BSAggregator'
import { SwapApi, type TSwapApiOrder, type TSwapToken } from '../features/swap'

const gasToken: TSwapToken = {
  id: 'gasn3:neo3',
  chain: 'neo3',
  assetId: 'GASN3',
  blockchain: 'neo3',
  symbol: 'GAS',
  name: 'GAS',
  hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
  decimals: 8,
  addressTemplateUrl: `${BSCommonConstants.DORA_URL}/address/neo3/mainnet/{address}`,
  txTemplateUrl: `${BSCommonConstants.DORA_URL}/transaction/neo3/mainnet/{txId}`,
}

const xrpToken: TSwapToken = {
  id: 'xrp:ripple',
  chain: 'ripple',
  assetId: 'XRP',
  symbol: 'XRP',
  name: 'XRP',
}

const order: TSwapApiOrder = {
  orderId: 'order-id',
  quoteId: 'quote-id',
  provider: 'simpleswap',
  executionFamily: 'deposit_order',
  executionMode: 'deposit_address',
  from: { chain: 'neo3', assetId: 'GASN3', amount: '10' },
  to: { chain: 'ethereum', assetId: 'ETH', amountEstimated: '0.03' },
  addresses: { destination: { address: '0xdestination' } },
  status: 'awaiting_deposit',
  steps: [],
  support: { correlationId: 'correlation-id' },
}

const createAxiosError = (message: string) =>
  Object.assign(new Error('Request failed'), { isAxiosError: true, response: { data: { message } } })

let swapApi: SwapApi
let bsAggregator: BSAggregator
let getMock: ReturnType<typeof vi.fn>
let postMock: ReturnType<typeof vi.fn>

describe('SwapApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getMock = vi.fn()
    postMock = vi.fn()
    vi.spyOn(axios, 'create').mockReturnValue({ get: getMock, post: postMock } as any)

    bsAggregator = new BSAggregator([new BSNeo3(), new BSNeoX()])
    swapApi = new SwapApi()
  })

  it('Should use the unified swap backend url', async () => {
    getMock.mockResolvedValue({ data: { destinations: [] } })

    await swapApi.fetchDestinations(gasToken, bsAggregator)

    expect(axios.create).toHaveBeenCalledWith(
      // TODO: change to BSCommonConstants.COZ_API_URL
      expect.objectContaining({ baseURL: `${BSCommonConstants.COZ_API_STAGE_URL}/v2/p/swap` })
    )
  })

  it('Should send the same correlation ID header in every request', async () => {
    getMock.mockResolvedValue({ data: { destinations: [] } })

    await swapApi.fetchDestinations(gasToken, bsAggregator)

    expect(swapApi.correlationId).toEqual(expect.any(String))
    expect(axios.create).toHaveBeenCalledTimes(1)
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'X-Correlation-Id': swapApi.correlationId } })
    )
  })

  it('Should reuse the given correlation ID', async () => {
    getMock.mockResolvedValue({ data: { destinations: [] } })

    const api = new SwapApi('given-correlation-id')
    await api.fetchDestinations(gasToken, bsAggregator)

    expect(api.correlationId).toBe('given-correlation-id')
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'X-Correlation-Id': 'given-correlation-id' } })
    )
  })

  it('Should generate a different correlation ID for each instance', () => {
    expect(new SwapApi().correlationId).not.toBe(new SwapApi().correlationId)
  })

  it('Should fetch the destinations converted to tokens', async () => {
    getMock.mockResolvedValue({
      data: {
        destinations: [
          { chain: 'neo3', assetId: 'NEO3' },
          { chain: 'ripple', assetId: 'XRP' },
        ],
      },
    })

    const tokens = await swapApi.fetchDestinations(gasToken, bsAggregator)

    expect(tokens).toEqual([
      {
        ...gasToken,
        id: 'neo3:neo3',
        assetId: 'NEO3',
        symbol: 'NEO',
        name: 'NEO',
        hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
        decimals: 0,
        network: undefined,
      },
      { ...xrpToken, network: undefined },
    ])
  })

  it('Should cache destinations by token', async () => {
    getMock.mockResolvedValue({ data: { destinations: [{ chain: 'ripple', assetId: 'XRP' }] } })

    await swapApi.fetchDestinations(gasToken, bsAggregator)
    await swapApi.fetchDestinations(gasToken, bsAggregator)

    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('Should create quotes', async () => {
    postMock.mockResolvedValue({
      data: {
        quoteRequestId: 'quote-request-id',
        selectionMode: 'auto',
        recommendedQuoteId: 'quote-id',
        quotes: [
          {
            quoteId: 'quote-id',
            provider: 'simpleswap',
            executionFamily: 'deposit_order',
            executionMode: 'deposit_address',
            fromAmount: '10',
            toAmountEstimated: '9.5',
            rateMode: 'floating',
            expiresAt: '2026-01-01T00:00:00Z',
            fees: null,
          },
        ],
      },
    })

    const result = await swapApi.createQuotes({
      tokenToUse: gasToken,
      tokenToReceive: xrpToken,
      amount: '10',
      sourceAddress: 'source-address',
      addressToReceive: 'receive-address',
      extraId: ' 123 ',
      refundAddress: 'refund-address',
    })

    expect(postMock).toHaveBeenCalledWith('/quotes', {
      from: { chain: 'neo3', assetId: 'GASN3', network: undefined, amount: '10' },
      to: { chain: 'ripple', assetId: 'XRP', network: undefined },
      source: { address: 'source-address' },
      destination: { address: 'receive-address', tag: '123' },
      refund: { address: 'refund-address' },
      selection: { mode: 'auto' },
      rateMode: 'floating',
    })

    expect(result).toEqual({
      recommendedQuoteId: 'quote-id',
      quotes: [
        {
          id: 'quote-id',
          provider: 'simpleswap',
          executionFamily: 'deposit_order',
          executionMode: 'deposit_address',
          amountToUse: '10',
          amountToReceive: '9.5',
          amountToReceiveMin: undefined,
          expiresAt: '2026-01-01T00:00:00Z',
          fees: [],
        },
      ],
    })
  })

  it('Should create quotes for a specific provider', async () => {
    postMock.mockResolvedValue({ data: { quotes: [] } })

    await swapApi.createQuotes({
      tokenToUse: gasToken,
      tokenToReceive: xrpToken,
      amount: '10',
      sourceAddress: 'source-address',
      addressToReceive: 'receive-address',
      refundAddress: 'refund-address',
      provider: 'swapkit',
    })

    expect(postMock).toHaveBeenCalledWith(
      '/quotes',
      expect.objectContaining({
        selection: { mode: 'manual', preferredProvider: 'swapkit' },
        destination: { address: 'receive-address', tag: undefined },
      })
    )
  })

  it('Should throw an amount below minimum error when the backend rejects the amount', async () => {
    postMock.mockRejectedValue(createAxiosError('amount below minimum: 0.1 is below the minimum of 1.5 for this pair'))

    const promise = swapApi.createQuotes({
      tokenToUse: gasToken,
      tokenToReceive: xrpToken,
      amount: '0.1',
      sourceAddress: 'source-address',
      addressToReceive: 'receive-address',
      refundAddress: 'refund-address',
    })

    await expect(promise).rejects.toBeInstanceOf(BSError)
    await expect(promise).rejects.toMatchObject({ code: 'AMOUNT_BELOW_MINIMUM', metadata: { minAmount: '1.5' } })
  })

  it('Should throw a no quotes available error when the provider returns no routes', async () => {
    postMock.mockRejectedValue(createAxiosError('swapkit quote: no routes returned'))

    const promise = swapApi.createQuotes({
      tokenToUse: gasToken,
      tokenToReceive: xrpToken,
      amount: '10',
      sourceAddress: 'source-address',
      addressToReceive: 'receive-address',
      refundAddress: 'refund-address',
    })

    await expect(promise).rejects.toBeInstanceOf(BSError)
    await expect(promise).rejects.toMatchObject({ code: 'NO_QUOTES_AVAILABLE' })
  })

  it('Should throw an amount above maximum error when the backend rejects the amount', async () => {
    postMock.mockRejectedValue(createAxiosError('amount below minimum: 1000 exceeds the maximum of 500 for this pair'))

    await expect(
      swapApi.createQuotes({
        tokenToUse: gasToken,
        tokenToReceive: xrpToken,
        amount: '1000',
        sourceAddress: 'source-address',
        addressToReceive: 'receive-address',
        refundAddress: 'refund-address',
      })
    ).rejects.toMatchObject({ code: 'AMOUNT_ABOVE_MAXIMUM' })
  })

  it('Should rethrow errors that are not from the backend', async () => {
    const error = new Error('network down')
    postMock.mockRejectedValue(error)

    await expect(
      swapApi.createOrder({
        quoteId: 'quote-id',
        sourceAddress: 'source-address',
        addressToReceive: 'receive-address',
        refundAddress: 'refund-address',
      })
    ).rejects.toBe(error)
  })

  it('Should create an order', async () => {
    postMock.mockResolvedValue({ data: order })

    const result = await swapApi.createOrder({
      quoteId: 'quote-id',
      sourceAddress: 'source-address',
      addressToReceive: 'receive-address',
      extraId: null,
      refundAddress: 'refund-address',
    })

    expect(postMock).toHaveBeenCalledWith('/orders', {
      quoteId: 'quote-id',
      source: { address: 'source-address' },
      destination: { address: 'receive-address', tag: undefined },
      refund: { address: 'refund-address' },
    })
    expect(result).toEqual(order)
  })

  it('Should get an order refreshing its status', async () => {
    getMock.mockResolvedValue({ data: order })

    const result = await swapApi.getOrder('order-id')

    expect(getMock).toHaveBeenCalledWith('/orders/order-id', { params: { refresh: true } })
    expect(result).toEqual(order)
  })

  it('Should report a step transaction', async () => {
    postMock.mockResolvedValue({ data: order })

    const result = await swapApi.reportStepTransaction({
      orderId: 'order-id',
      stepId: 'step-id',
      txHash: '0xtx',
      chainId: '1',
    })

    expect(postMock).toHaveBeenCalledWith('/orders/order-id/steps/step-id/transaction', {
      txHash: '0xtx',
      chainId: '1',
    })
    expect(result).toEqual(order)
  })

  it('Should throw a duplicate tx hash error when the step transaction was already reported', async () => {
    postMock.mockRejectedValue(createAxiosError('tx hash already reported for this step'))

    await expect(
      swapApi.reportStepTransaction({ orderId: 'order-id', stepId: 'step-id', txHash: '0xtx' })
    ).rejects.toMatchObject({ code: 'DUPLICATE_TX_HASH' })
  })

  it('Should get the orders of an address', async () => {
    const result = await swapApi.getOrdersByAddress({ address: '0xaddress' })

    expect(result.length).toBeGreaterThan(0)
    result.forEach(orderSummary => {
      expect(orderSummary).toEqual({
        orderId: expect.any(String),
        sourceTxHash: expect.toBeOneOf([expect.any(String), null]),
      })
    })
  })

  it('Should paginate the orders of an address', async () => {
    const allOrders = await swapApi.getOrdersByAddress({ address: '0xaddress' })
    const result = await swapApi.getOrdersByAddress({ address: '0xaddress', limit: 1, offset: 1 })

    expect(result).toEqual([allOrders[1]])
  })
})
