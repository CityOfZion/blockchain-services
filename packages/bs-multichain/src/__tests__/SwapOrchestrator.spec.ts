import {
  BSError,
  BSUtilsHelper,
  type TBalanceResponse,
  type TBSAccount,
  type TBSToken,
  type TTransactionDefault,
} from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSEthereum } from '@cityofzion/bs-ethereum'
import { BSAggregator } from '../BSAggregator'
import {
  SwapApi,
  SwapHelper,
  SwapOrchestrator,
  SwapOrchestratorClass,
  type TSwapApiOrder,
  type TSwapQuote,
  type TSwapToken,
  type TSwapTokenToUse,
} from '../features/swap'

const gasToken: TSwapTokenToUse = {
  id: 'gasn3:neo3',
  chain: 'neo3',
  assetId: 'GASN3',
  blockchain: 'neo3',
  symbol: 'GAS',
  name: 'GAS',
  hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
  decimals: 8,
}

const neoToken: TSwapToken = {
  id: 'neo3:neo3',
  chain: 'neo3',
  assetId: 'NEO3',
  blockchain: 'neo3',
  symbol: 'NEO',
  name: 'NEO',
  hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
  decimals: 0,
}

const flmToken: TSwapTokenToUse = {
  id: 'flm:neo3',
  chain: 'neo3',
  assetId: 'FLM',
  blockchain: 'neo3',
  symbol: 'FLM',
  name: 'Flamingo',
  hash: '0xf0151f528127558851b39c2cd8aa47da7418ab28',
  decimals: 8,
}

const xrpToken: TSwapToken = {
  id: 'xrp:ripple',
  chain: 'ripple',
  assetId: 'XRP',
  symbol: 'XRP',
  name: 'XRP',
}

const ethToken: TSwapTokenToUse = {
  id: 'eth:ethereum',
  chain: 'ethereum',
  assetId: 'ETH',
  blockchain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  hash: '-',
  decimals: 18,
}

const btcToken: TSwapToken = {
  id: 'btc:bitcoin',
  chain: 'bitcoin',
  assetId: 'BTC',
  symbol: 'BTC',
  name: 'BTC',
}

const depositQuote: TSwapQuote = {
  id: 'deposit-quote-id',
  provider: 'simpleswap',
  executionFamily: 'deposit_order',
  executionMode: 'deposit_address',
  amountToUse: '10',
  amountToReceive: '9.5',
  fees: [],
}

const routeQuote: TSwapQuote = {
  id: 'route-quote-id',
  provider: 'swapkit',
  executionFamily: 'route_payload',
  executionMode: 'multi_step',
  amountToUse: '1',
  amountToReceive: '0.03',
  fees: [{ code: 'liquidity_fee', amount: '0.001' }],
}

const createTransaction = <N extends string>(blockchain: N, txId: string): TTransactionDefault<N> => ({
  blockchain,
  isPending: true,
  txId,
  txIdUrl: `https://example.com/tx/${txId}`,
  date: '2026-03-18T00:00:00Z',
  view: 'default',
  events: [],
})

const depositOrder: TSwapApiOrder = {
  orderId: 'deposit-order-id',
  quoteId: 'deposit-quote-id',
  provider: 'simpleswap',
  executionFamily: 'deposit_order',
  executionMode: 'deposit_address',
  from: { chain: 'neo3', assetId: 'GASN3', amount: '10' },
  to: { chain: 'neo3', assetId: 'NEO3', amountEstimated: '9.5' },
  addresses: {
    source: { address: 'NSourceAddress' },
    destination: { address: 'NDestinationAddress' },
    refund: { address: 'NSourceAddress' },
  },
  status: 'awaiting_deposit',
  support: { correlationId: 'correlation-id' },
  steps: [
    {
      stepId: 'send-to-provider-1',
      kind: 'send_to_provider',
      status: 'pending',
      sendInstruction: {
        depositAddress: 'NNdepositAddress111111111111111111111',
        fromAmount: '10',
        fromAsset: { chain: 'neo3', assetId: 'GASN3' },
      },
    },
  ],
}

const routeOrder: TSwapApiOrder = {
  orderId: 'route-order-id',
  quoteId: 'route-quote-id',
  provider: 'swapkit',
  executionFamily: 'route_payload',
  executionMode: 'multi_step',
  from: { chain: 'ethereum', assetId: 'ETH', amount: '1' },
  to: { chain: 'bitcoin', assetId: 'BTC', amountEstimated: '0.03' },
  addresses: {
    source: { address: '0xsource' },
    destination: { address: 'bc1destination' },
    refund: { address: '0xsource' },
  },
  status: 'awaiting_user_action',
  support: { correlationId: 'correlation-id' },
  steps: [
    {
      stepId: 'approval-1',
      kind: 'approval',
      status: 'pending',
      chainId: '1',
      approvalMode: 'erc20_approve',
      txPayload: { to: '0xtoken', data: '0xapprove' },
    },
    {
      stepId: 'sign-and-broadcast-1',
      kind: 'swap',
      status: 'pending',
      chainId: '1',
      txPayload: { to: '0xrouter', data: '0xswap', value: '1000000000000000000' },
    },
  ],
}

let orchestrator: InstanceType<typeof SwapOrchestratorClass>
let neo3Service: BSNeo3
let ethereumService: BSEthereum<'ethereum'>
let neo3Account: TBSAccount<'neo3'>
let ethereumAccount: TBSAccount<'ethereum'>

const waitForState = (predicate: () => boolean) => vi.waitUntil(predicate, { interval: 50, timeout: 5000 })

const createOrchestrator = () => {
  const bsAggregator = new BSAggregator([neo3Service, ethereumService])
  return new SwapOrchestrator(bsAggregator) as InstanceType<typeof SwapOrchestratorClass>
}

const waitForAvailableTokensToUse = () =>
  waitForState(() => orchestrator.store.getState().availableTokensToUse.value !== null)

const toBSToken = ({ symbol, name, hash, decimals }: TSwapTokenToUse): TBSToken => ({ symbol, name, hash, decimals })

const neo3Balances = () =>
  [
    { token: toBSToken(gasToken), amount: '100' },
    { token: toBSToken(flmToken), amount: '100' },
  ] as TBalanceResponse[]

const fillOrchestrator = async ({
  tokenToUse = gasToken,
  tokenToReceive = neoToken,
  account = neo3Account as TBSAccount<any>,
  amount = '10',
  address = neo3Account.address,
  balances = neo3Balances(),
}: {
  tokenToUse?: TSwapTokenToUse
  tokenToReceive?: TSwapToken
  account?: TBSAccount<any>
  amount?: string
  address?: string
  balances?: TBalanceResponse[]
} = {}) => {
  await orchestrator.setAccountToUse(account)
  await orchestrator.setAccountToUseBalances(balances)
  await waitForAvailableTokensToUse()
  await orchestrator.setTokenToUse(tokenToUse)
  await waitForState(() => orchestrator.store.getState().availableTokensToReceive.value !== null)
  await orchestrator.setTokenToReceive(tokenToReceive)
  await orchestrator.setAmountToUse(amount)
  await orchestrator.setAddressToReceive(address)
}

describe('SwapOrchestrator', () => {
  beforeAll(async () => {
    neo3Account = await new BSNeo3().generateAccountFromKey(process.env.TEST_NEO3_PRIVATE_KEY)
    ethereumAccount = await new BSEthereum('ethereum').generateAccountFromKey(`0x${'1'.repeat(64)}`)
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()

    neo3Service = new BSNeo3()
    ethereumService = new BSEthereum('ethereum')
    vi.spyOn(ethereumService, 'waitForTransactionConfirmation').mockResolvedValue()

    vi.spyOn(SwapHelper, 'convertToSwapToken').mockImplementation((_blockchain, token) =>
      [gasToken, flmToken, ethToken].find(item => item.hash === token.hash)
    )
    vi.spyOn(SwapApi.prototype, 'fetchDestinations').mockImplementation(async token => {
      if (token.id === ethToken.id) return [btcToken]
      if (token.id === flmToken.id) return [xrpToken]
      return [neoToken, xrpToken]
    })
    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [depositQuote],
      recommendedQuoteId: depositQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(depositOrder)
    vi.spyOn(neo3Service, 'calculateTransferFee').mockResolvedValue('0.1')
    vi.spyOn(ethereumService, 'calculateTransferFee').mockResolvedValue('0.001')

    orchestrator = createOrchestrator()
  })

  afterEach(() => {
    orchestrator.cleanup()
  })

  it('Should not have availableTokensToUse before the account balances are set', async () => {
    expect(orchestrator.store.getState().availableTokensToUse).toEqual({
      value: null,
      valid: null,
      error: null,
      loading: false,
      validating: false,
    })

    await orchestrator.setAccountToUse(neo3Account)

    expect(orchestrator.store.getState().availableTokensToUse.value).toBeNull()
  })

  it('Should set availableTokensToUse from the account balances with amount', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances([
      { token: toBSToken(gasToken), amount: '100' },
      { token: toBSToken(flmToken), amount: '0' },
    ])

    await waitForAvailableTokensToUse()

    expect(SwapHelper.convertToSwapToken).toHaveBeenCalledTimes(1)
    expect(SwapHelper.convertToSwapToken).toHaveBeenCalledWith('neo3', toBSToken(gasToken), expect.any(BSAggregator))
    expect(orchestrator.store.getState().availableTokensToUse).toEqual({
      value: [gasToken],
      valid: true,
      error: null,
      loading: false,
      validating: false,
    })
  })

  it('Should ignore balance tokens that cannot be used by the swap', async () => {
    vi.spyOn(SwapHelper, 'convertToSwapToken').mockImplementation((_blockchain, token) =>
      token.hash === gasToken.hash ? gasToken : undefined
    )

    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())
    await waitForAvailableTokensToUse()

    expect(orchestrator.store.getState().availableTokensToUse.value).toEqual([gasToken])
  })

  it('Should set availableTokensToUse as invalid when converting the balances fails', async () => {
    vi.spyOn(SwapHelper, 'convertToSwapToken').mockImplementation(() => {
      throw new Error('conversion failed')
    })

    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())

    await waitForState(() => orchestrator.store.getState().availableTokensToUse.valid === false)

    expect(orchestrator.store.getState().availableTokensToUse.error).toEqual(
      expect.objectContaining({ code: 'UNEXPECTED_ERROR' })
    )
  })

  it('Should set tokenToUse when it is available', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())
    await waitForAvailableTokensToUse()

    await orchestrator.setTokenToUse(gasToken)

    expect(orchestrator.store.getState().tokenToUse).toEqual({
      value: gasToken,
      valid: true,
      error: null,
      validating: false,
    })
  })

  it('Should set tokenToUse as invalid when there are no available tokens', async () => {
    await orchestrator.setTokenToUse(gasToken)

    expect(orchestrator.store.getState().tokenToUse.error).toEqual(
      expect.objectContaining({ code: 'NO_AVAILABLE_TOKENS' })
    )
  })

  it('Should set tokenToUse as invalid when the token is not available', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances([{ token: toBSToken(gasToken), amount: '100' }])
    await waitForAvailableTokensToUse()

    await orchestrator.setTokenToUse(flmToken)

    expect(orchestrator.store.getState().tokenToUse).toEqual(
      expect.objectContaining({
        value: null,
        valid: false,
        error: expect.objectContaining({ code: 'TOKEN_NOT_AVAILABLE' }),
      })
    )
  })

  it('Should reset availableTokensToUse and tokenToUse when the account changes', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())
    await waitForAvailableTokensToUse()
    await orchestrator.setTokenToUse(gasToken)

    await orchestrator.setAccountToUse(ethereumAccount)

    await waitForState(() => orchestrator.store.getState().tokenToUse.value === null)

    const state = orchestrator.store.getState()
    expect(state.accountToUseBalances.value).toBeNull()
    expect(state.availableTokensToUse.value).toBeNull()
  })

  it('Should reset tokenToUse when it is no longer in the account balances', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())
    await waitForAvailableTokensToUse()
    await orchestrator.setTokenToUse(flmToken)

    await orchestrator.setAccountToUseBalances([{ token: toBSToken(gasToken), amount: '100' }])

    await waitForState(() => orchestrator.store.getState().tokenToUse.value === null)
  })

  it('Should set accountToUse as invalid when its blockchain is not supported by the swap', async () => {
    await orchestrator.setAccountToUse({ ...ethereumAccount, blockchain: 'neox' })

    expect(orchestrator.store.getState().accountToUse).toEqual(
      expect.objectContaining({
        value: null,
        valid: false,
        error: expect.objectContaining({ code: 'ACCOUNT_BLOCKCHAIN_NOT_SUPPORTED' }),
      })
    )
  })

  it('Should load availableTokensToReceive when tokenToUse is set', async () => {
    await orchestrator.setAccountToUse(neo3Account)
    await orchestrator.setAccountToUseBalances(neo3Balances())
    await waitForAvailableTokensToUse()
    await orchestrator.setTokenToUse(gasToken)

    await waitForState(() => orchestrator.store.getState().availableTokensToReceive.value !== null)

    expect(SwapApi.prototype.fetchDestinations).toHaveBeenCalledWith(gasToken, expect.any(BSAggregator))
    expect(orchestrator.store.getState().availableTokensToReceive).toEqual(
      expect.objectContaining({ value: [neoToken, xrpToken], valid: true, loading: false, error: null })
    )
  })

  it('Should reset tokenToReceive when it is not available for the new tokenToUse', async () => {
    await fillOrchestrator()

    await orchestrator.setTokenToUse(flmToken)

    await waitForState(() => orchestrator.store.getState().tokenToReceive.value === null)
  })

  it('Should validate addressToReceive with the blockchain service when the blockchain is known', async () => {
    await fillOrchestrator({ address: 'invalid-address' })

    await waitForState(() => orchestrator.store.getState().addressToReceive.valid === false)

    expect(orchestrator.store.getState().addressToReceive.error).toEqual(
      expect.objectContaining({ code: 'INVALID_ADDRESS_FORMAT' })
    )
  })

  it('Should accept addressToReceive when the blockchain is not known', async () => {
    await fillOrchestrator({ tokenToReceive: xrpToken, address: 'rExternalAddress' })

    await waitForState(() => orchestrator.store.getState().addressToReceive.valid === true)
  })

  it('Should request quotes and set the recommended quote when all quote fields are available', async () => {
    const secondQuote = { ...depositQuote, id: 'second', amountToReceive: '9' }
    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [secondQuote, depositQuote],
      recommendedQuoteId: depositQuote.id,
    })

    await fillOrchestrator()

    await waitForState(() => orchestrator.store.getState().quote.value !== null)

    expect(SwapApi.prototype.createQuotes).toHaveBeenCalledWith({
      tokenToUse: gasToken,
      tokenToReceive: neoToken,
      amount: '10',
      sourceAddress: neo3Account.address,
      addressToReceive: neo3Account.address,
      refundAddress: neo3Account.address,
    })

    const state = orchestrator.store.getState()
    expect(state.quote).toEqual({ value: depositQuote, valid: true, error: null, loading: false, validating: false })
    expect(state.quote.value?.amountToReceive).toBe('9.5')
  })

  it('Should not request quotes while addressToReceive is not valid', async () => {
    await fillOrchestrator({ address: 'invalid-address' })

    await waitForState(() => orchestrator.store.getState().addressToReceive.valid === false)

    expect(SwapApi.prototype.createQuotes).not.toHaveBeenCalled()
    expect(orchestrator.store.getState().quote.value).toBeNull()
  })

  it('Should set the quote error when the backend rejects the amount', async () => {
    vi.spyOn(SwapApi.prototype, 'createQuotes').mockRejectedValue(
      new BSError('amount below minimum: 10 is below the minimum of 12.5 for this pair', 'AMOUNT_BELOW_MINIMUM')
    )

    await fillOrchestrator()

    await waitForState(() => orchestrator.store.getState().quote.valid === false)

    expect(orchestrator.store.getState().quote).toEqual(
      expect.objectContaining({
        value: null,
        valid: false,
        error: expect.objectContaining({ code: 'AMOUNT_BELOW_MINIMUM' }),
      })
    )
  })

  it('Should set amountToUse as invalid when amount exceeds balance', async () => {
    await fillOrchestrator({
      balances: [{ token: neo3Service.feeToken, amount: '5' }] as unknown as TBalanceResponse[],
    })

    await waitForState(() => orchestrator.store.getState().amountToUse.valid === false)

    expect(orchestrator.store.getState().amountToUse.error).toEqual(
      expect.objectContaining({ code: 'AMOUNT_EXCEEDS_BALANCE' })
    )
  })

  it('Should set fee as invalid when fee token balance does not cover amount plus fee', async () => {
    await fillOrchestrator({
      balances: [{ token: neo3Service.feeToken, amount: '10.05' }] as unknown as TBalanceResponse[],
    })

    await waitForState(() => orchestrator.store.getState().fee.valid === false)

    expect(orchestrator.store.getState().fee.error).toEqual(expect.objectContaining({ code: 'FEE_EXCEEDS_BALANCE' }))
  })

  it('Should not be able to swap with the initial state', async () => {
    expect(orchestrator.isAbleToSwap()).toBe(false)
    await expect(orchestrator.createOrder()).rejects.toMatchObject({ code: 'CANNOT_PERFORM_SWAP' })
  })

  it('Should send the optional extraId when creating the order', async () => {
    vi.spyOn(neo3Service, 'transfer').mockResolvedValue([createTransaction('neo3', '0xfromtx')])

    await fillOrchestrator({ tokenToReceive: xrpToken, address: 'rExternalAddress' })
    await orchestrator.setExtraId('123456')
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    await orchestrator.executeOrder()

    expect(SwapApi.prototype.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ addressToReceive: 'rExternalAddress', extraId: '123456' })
    )
  })

  it('Should swap a deposit order by transferring to the deposit address', async () => {
    const transaction = createTransaction('neo3', '0xfromtx')
    const transferSpy = vi.spyOn(neo3Service, 'transfer').mockResolvedValue([transaction])
    const reportSpy = vi.spyOn(SwapApi.prototype, 'reportStepTransaction')

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(SwapApi.prototype.createOrder).toHaveBeenCalledWith({
      quoteId: depositQuote.id,
      sourceAddress: neo3Account.address,
      addressToReceive: neo3Account.address,
      extraId: null,
      refundAddress: neo3Account.address,
    })
    expect(transferSpy).toHaveBeenCalledWith({
      senderAccount: neo3Account,
      intents: [
        {
          amount: '10',
          receiverAddress: 'NNdepositAddress111111111111111111111',
          token: { decimals: 8, hash: gasToken.hash, name: 'GAS', symbol: 'GAS' },
        },
      ],
    })
    expect(reportSpy).not.toHaveBeenCalled()
    expect(result).toEqual(
      expect.objectContaining({
        swapId: 'deposit-order-id',
        provider: 'simpleswap',
        status: 'confirming',
        txIdFrom: '0xfromtx',
        amountFrom: '10',
        amountTo: '9.5',
        fee: '0.1',
        tokenFrom: gasToken,
        tokenTo: neoToken,
      })
    )
  })

  it('Should swap a route payload order by sending every step and reporting the transactions', async () => {
    const approvalTransaction = createTransaction('ethereum', '0xapprovaltx')
    const swapTransaction = createTransaction('ethereum', '0xswaptx')

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    const reportSpy = vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    const sendSpy = vi
      .spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValueOnce(approvalTransaction)
      .mockResolvedValueOnce(swapTransaction)

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(sendSpy).toHaveBeenNthCalledWith(1, {
      senderAccount: ethereumAccount,
      payload: { to: '0xtoken', data: '0xapprove', chainId: '1' },
    })
    expect(sendSpy).toHaveBeenNthCalledWith(2, {
      senderAccount: ethereumAccount,
      payload: { to: '0xrouter', data: '0xswap', value: '1000000000000000000', chainId: '1' },
    })
    expect(reportSpy).toHaveBeenNthCalledWith(1, {
      orderId: 'route-order-id',
      stepId: 'approval-1',
      txHash: '0xapprovaltx',
      chainId: '1',
    })
    expect(reportSpy).toHaveBeenNthCalledWith(2, {
      orderId: 'route-order-id',
      stepId: 'sign-and-broadcast-1',
      txHash: '0xswaptx',
      chainId: '1',
    })
    expect(result).toEqual(
      expect.objectContaining({
        swapId: 'route-order-id',
        provider: 'swapkit',
        status: 'confirming',
        txIdFrom: '0xswaptx',
      })
    )
  })

  it('Should swap a route payload order without an approval step', async () => {
    const swapTransaction = createTransaction('ethereum', '0xswaptx')

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue({ ...routeOrder, steps: [routeOrder.steps![1]] })
    vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    const sendSpy = vi.spyOn(ethereumService, 'sendTransactionPayload').mockResolvedValue(swapTransaction)

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(ethereumService.waitForTransactionConfirmation).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({ status: 'confirming', txIdFrom: '0xswaptx' }))
  })

  it('Should wait for the approval to be confirmed before sending the swap transaction', async () => {
    const calls: string[] = []

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    vi.spyOn(ethereumService, 'sendTransactionPayload').mockImplementation(async ({ payload }) => {
      calls.push(`send:${payload.data}`)
      return createTransaction('ethereum', payload.data === '0xapprove' ? '0xapprovaltx' : '0xswaptx')
    })
    vi.spyOn(ethereumService, 'waitForTransactionConfirmation').mockImplementation(async txId => {
      calls.push(`wait:${txId}`)
    })

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    await orchestrator.executeOrder()

    expect(calls).toEqual(['send:0xapprove', 'wait:0xapprovaltx', 'send:0xswap'])
  })

  it('Should fail the swap without sending the swap transaction when the approval fails', async () => {
    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    const sendSpy = vi
      .spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValue(createTransaction('ethereum', '0xapprovaltx'))
    vi.spyOn(ethereumService, 'waitForTransactionConfirmation').mockRejectedValue(
      new BSError('Transaction 0xapprovaltx failed', 'TRANSACTION_FAILED')
    )

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('failed')
  })

  it('Should report the approval and swap steps', async () => {
    const approvalTransaction = createTransaction('ethereum', '0xapprovaltx')
    const swapTransaction = createTransaction('ethereum', '0xswaptx')

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    const reportSpy = vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    vi.spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValueOnce(approvalTransaction)
      .mockResolvedValueOnce(swapTransaction)

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(reportSpy).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'approval-1', txHash: '0xapprovaltx' }))
    expect(reportSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: 'sign-and-broadcast-1', txHash: '0xswaptx' })
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'confirming',
        txIdFrom: '0xswaptx',
      })
    )
  })

  it('Should keep the swap trackable when reporting the transaction fails after it was broadcasted', async () => {
    const swapTransaction = createTransaction('ethereum', '0xswaptx')

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockRejectedValue(new Error('backend down'))
    vi.spyOn(BSUtilsHelper, 'wait').mockResolvedValue(undefined)
    vi.spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValueOnce(createTransaction('ethereum', '0xapprovaltx'))
      .mockResolvedValueOnce(swapTransaction)

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(result).toEqual(
      expect.objectContaining({
        swapId: 'route-order-id',
        status: 'confirming',
        txIdFrom: '0xswaptx',
      })
    )
  })

  it('Should keep the swap ID when a step fails after the order is created', async () => {
    const approvalTransaction = createTransaction('ethereum', '0xapprovaltx')

    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue(routeOrder)
    vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    vi.spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValueOnce(approvalTransaction)
      .mockRejectedValueOnce(new Error('insufficient funds'))

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(result).toEqual(
      expect.objectContaining({
        swapId: 'route-order-id',
        status: 'failed',
        txIdFrom: undefined,
        log: 'insufficient funds',
      })
    )
  })

  it('Should send the transaction payload step regardless of its kind', async () => {
    vi.spyOn(SwapApi.prototype, 'createQuotes').mockResolvedValue({
      quotes: [routeQuote],
      recommendedQuoteId: routeQuote.id,
    })
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue({
      ...routeOrder,
      steps: [{ ...routeOrder.steps![1], kind: 'unknown' }],
    })
    vi.spyOn(SwapApi.prototype, 'reportStepTransaction').mockResolvedValue(routeOrder)
    const sendSpy = vi
      .spyOn(ethereumService, 'sendTransactionPayload')
      .mockResolvedValue(createTransaction('ethereum', '0xswaptx'))

    await fillOrchestrator({
      tokenToUse: ethToken,
      tokenToReceive: btcToken,
      account: ethereumAccount,
      amount: '1',
      address: 'bc1qexternaladdress',
      balances: [{ token: ethereumService.feeToken, amount: '2' }] as unknown as TBalanceResponse[],
    })
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expect.objectContaining({ status: 'confirming', txIdFrom: '0xswaptx' }))
  })

  it('Should refresh the quote with the same provider when it is expired before creating the order', async () => {
    const expiredQuote = { ...depositQuote, expiresAt: new Date(Date.now() - 1000).toISOString() }
    const refreshedQuote = { ...depositQuote, id: 'refreshed-quote-id', amountToReceive: '9.4' }

    vi.spyOn(SwapApi.prototype, 'createQuotes')
      .mockResolvedValueOnce({ quotes: [expiredQuote], recommendedQuoteId: expiredQuote.id })
      .mockResolvedValueOnce({ quotes: [refreshedQuote], recommendedQuoteId: refreshedQuote.id })
    vi.spyOn(neo3Service, 'transfer').mockResolvedValue([createTransaction('neo3', '0xfromtx')])

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(SwapApi.prototype.createQuotes).toHaveBeenLastCalledWith(expect.objectContaining({ provider: 'simpleswap' }))
    expect(SwapApi.prototype.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: 'refreshed-quote-id' })
    )
    expect(result.amountTo).toBe('9.4')
  })

  it('Should fail the swap when the deposit requires a memo and the blockchain does not support it', async () => {
    const transferSpy = vi.spyOn(neo3Service, 'transfer')
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue({
      ...depositOrder,
      steps: [
        {
          ...depositOrder.steps![0],
          sendInstruction: { ...depositOrder.steps![0].sendInstruction!, memo: '=:BTC.BTC:bc1q' },
        },
      ],
    })

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(transferSpy).toHaveBeenCalledWith(expect.objectContaining({ memo: '=:BTC.BTC:bc1q' }))
    await expect(transferSpy.mock.results[0].value).rejects.toMatchObject({ code: 'MEMO_NOT_SUPPORTED' })
    expect(result.status).toBe('failed')
    expect(result.txIdFrom).toBeUndefined()
  })

  it('Should fail the swap when a step requires a signature', async () => {
    vi.spyOn(SwapApi.prototype, 'createOrder').mockResolvedValue({
      ...routeOrder,
      steps: [
        {
          stepId: 'permit-1',
          kind: 'approval',
          status: 'pending',
          approvalMode: 'permit',
          signatureRequest: { type: 'eip712', domain: {}, types: {}, message: {} },
        },
      ],
    })

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    const result = await orchestrator.executeOrder()

    expect(result.status).toBe('failed')
    expect(result.txIdFrom).toBeUndefined()
  })

  it('Should throw when the order creation fails', async () => {
    vi.spyOn(SwapApi.prototype, 'createOrder').mockRejectedValue(new BSError('quote expired', 'QUOTE_EXPIRED'))

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await expect(orchestrator.createOrder()).rejects.toMatchObject({ code: 'QUOTE_EXPIRED' })
    await expect(orchestrator.executeOrder()).rejects.toMatchObject({ code: 'ORDER_NOT_CREATED' })
  })

  it('Should not be able to execute an order before creating it', async () => {
    await expect(orchestrator.executeOrder()).rejects.toMatchObject({ code: 'ORDER_NOT_CREATED' })
  })

  it('Should return the created order without executing it', async () => {
    const transferSpy = vi.spyOn(neo3Service, 'transfer')

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    const result = await orchestrator.createOrder()

    expect(transferSpy).not.toHaveBeenCalled()
    expect(result).toEqual(
      expect.objectContaining({
        swapId: 'deposit-order-id',
        provider: 'simpleswap',
        status: 'confirming',
        txIdFrom: undefined,
        amountTo: '9.5',
      })
    )
  })

  it('Should not execute the same order twice', async () => {
    const transferSpy = vi.spyOn(neo3Service, 'transfer').mockResolvedValue([createTransaction('neo3', '0xfromtx')])

    await fillOrchestrator()
    await waitForState(() => orchestrator.isAbleToSwap())

    await orchestrator.createOrder()
    await orchestrator.executeOrder()

    await expect(orchestrator.executeOrder()).rejects.toMatchObject({ code: 'ORDER_NOT_CREATED' })
    expect(transferSpy).toHaveBeenCalledTimes(1)
  })

  it('Should map order statuses to swap statuses in getOrder', async () => {
    const getOrderSpy = vi.spyOn(SwapApi.prototype, 'getOrder')
    const bsAggregator = new BSAggregator([neo3Service, ethereumService])

    const cases: [TSwapApiOrder['status'], string][] = [
      ['awaiting_deposit', 'confirming'],
      ['source_tx_pending', 'confirming'],
      ['provider_processing', 'exchanging'],
      ['bridging', 'exchanging'],
      ['completed', 'finished'],
      ['expired', 'failed'],
      ['failed', 'failed'],
      ['refunded', 'refunded'],
    ]

    for (const [orderStatus, status] of cases) {
      getOrderSpy.mockResolvedValueOnce({
        ...depositOrder,
        status: orderStatus,
        support: { correlationId: 'id', sourceTxHash: '0xfrom', destinationTxHash: '0xto' },
      })

      const response = await SwapOrchestrator.getOrder('deposit-order-id', bsAggregator)

      expect(response).toEqual(expect.objectContaining({ status, txIdFrom: '0xfrom', txIdTo: '0xto' }))
    }

    expect(getOrderSpy).toHaveBeenCalledWith('deposit-order-id')
  })

  it('Should build the swap result from the order in getOrder', async () => {
    const bsAggregator = new BSAggregator([neo3Service, ethereumService])

    const order: TSwapApiOrder = {
      ...depositOrder,
      status: 'completed',
      to: { ...depositOrder.to, amountReceived: '9.4' },
      addresses: { ...depositOrder.addresses, destination: { address: 'rDestinationAddress', tag: '1234' } },
      support: { correlationId: 'id', sourceTxHash: '0xfrom', destinationTxHash: '0xto' },
    }

    vi.spyOn(SwapApi.prototype, 'getOrder').mockResolvedValue(order)

    const response = await SwapOrchestrator.getOrder('deposit-order-id', bsAggregator, 'correlation-id')

    expect(response).toEqual({
      swapId: 'deposit-order-id',
      correlationId: 'correlation-id',
      txIdFrom: '0xfrom',
      txIdTo: '0xto',
      provider: 'simpleswap',
      status: 'finished',
      addressFrom: 'NSourceAddress',
      tokenFrom: SwapHelper.convertAssetRefToSwapToken(order.from, bsAggregator),
      tokenTo: SwapHelper.convertAssetRefToSwapToken(order.to, bsAggregator),
      amountFrom: '10',
      amountTo: '9.4',
      addressTo: 'rDestinationAddress',
      extraIdTo: '1234',
      log: JSON.stringify(order),
    })
  })

  it('Should call retry with the expected configuration in getOrder', async () => {
    const retrySpy = vi.spyOn(BSUtilsHelper, 'retry').mockResolvedValue({ status: 'finished' })

    await SwapOrchestrator.getOrder('deposit-order-id', new BSAggregator([neo3Service, ethereumService]))

    expect(retrySpy).toHaveBeenCalledWith(expect.any(Function), { retries: 10, delay: 30000 })
  })

  it('Should get the orders of an address', async () => {
    const orders = [{ orderId: 'order-id', sourceTxHash: '0xtx' }]
    const getOrdersByAddressSpy = vi.spyOn(SwapApi.prototype, 'getOrdersByAddress').mockResolvedValue(orders)

    const response = await SwapOrchestrator.getOrdersByAddress({ address: '0xaddress', limit: 10, offset: 0 })

    expect(getOrdersByAddressSpy).toHaveBeenCalledWith({ address: '0xaddress', limit: 10, offset: 0 })
    expect(response).toEqual(orders)
  })
})
