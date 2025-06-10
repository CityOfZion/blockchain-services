import { Account, BalanceResponse, BSBigNumberHelper, BSError } from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BSNeoX } from '../BSNeoX'
import { Neo3NeoXBridgeService } from '../services/neo3neoXBridge/Neo3NeoXBridgeService'

let neo3NeoXBridgeService: Neo3NeoXBridgeService<'neox'>
let bsNeoXService: BSNeoX<'neox'>
let account: Account<'neox'>
let balances: BalanceResponse[]
let gasBalance: BalanceResponse
let neoBalance: BalanceResponse
let receiverAddress: string

const network = BSNeoXConstants.DEFAULT_NETWORK

describe.skip('Neo3NeoXBridgeService', () => {
  beforeAll(async () => {
    receiverAddress = process.env.TEST_BRIDGE_NEO3_ADDRESS
    bsNeoXService = new BSNeoX('neox', network)
    neo3NeoXBridgeService = new Neo3NeoXBridgeService(bsNeoXService)
    account = bsNeoXService.generateAccountFromKey(process.env.TEST_BRIDGE_PRIVATE_KEY)

    balances = await bsNeoXService.blockchainDataService.getBalance(account.address)
    balances.push({
      token: BSNeoXConstants.NEO_TOKEN,
      amount: '1',
    })

    gasBalance = balances.find(balance => balance.token.hash === BSNeoXConstants.NATIVE_ASSET.hash)!
    if (!gasBalance) {
      throw new Error('Gas balance not found')
    }

    neoBalance = balances.find(balance => balance.token.hash === BSNeoXConstants.NEO_TOKEN.hash)!
    if (!neoBalance) {
      throw new Error('NEO balance not found')
    }
  }, 60000)

  it('Should not be able to validate bridge using a token different of GAS or NEO', async () => {
    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '1.0',
        token: { decimals: 8, hash: 'non-existent', name: 'non-existent', symbol: 'non-existent' },
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN'))
  }, 60000)

  it('Should not be able to validate bridge if GAS balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeoXConstants.NATIVE_ASSET.hash)

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '1.0',
        token: gasBalance.token,
        balances: filteredBalances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is less than the minimum amount plus bridge fee', async () => {
    const minAmount = (neo3NeoXBridgeService.BRIDGE_MIN_AMOUNT - 0.1).toString()

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: minAmount,
        token: gasBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance', async () => {
    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: BSBigNumberHelper.fromNumber(gasBalance.amount).plus(1).toString(),
        token: gasBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance plus fee', async () => {
    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: gasBalance.amount,
        token: gasBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if NEO balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeoXConstants.NEO_TOKEN.hash)

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '1',
        token: neoBalance.token,
        balances: filteredBalances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('NEO balance not found', 'NEO_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is less than the minimum amount', async () => {
    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '0',
        token: neoBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is greater than balance', async () => {
    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: BSBigNumberHelper.fromNumber(neoBalance.amount).plus(1).toString(),
        token: neoBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than bridge fee', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0' }]

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than fees', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0.101' }]

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        receiverAddress,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than fees', 'INSUFFICIENT_GAS_BALANCE_FEES'))
  }, 60000)

  it('Should be able to validate bridge GAS', async () => {
    const validatedAmounts = await neo3NeoXBridgeService.validateInputs({
      amount: '1.1',
      token: gasBalance.token,
      balances,
      account,
      receiverAddress,
    })

    expect(validatedAmounts).toEqual({
      amount: '1.1',
      receiveAmount: '1',
      token: gasBalance.token,
    })
  })

  it('Should be able to validate bridge NEO', async () => {
    const validatedAmounts = await neo3NeoXBridgeService.validateInputs({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      receiverAddress,
    })
    expect(validatedAmounts).toEqual({
      amount: '1',
      receiveAmount: '1',
      token: neoBalance.token,
    })
  })

  it('Should be able to calculate bridge GAS fee', async () => {
    const fee = await neo3NeoXBridgeService.calculateFee({
      account,
      receiverAddress,
      validatedInputs: {
        amount: '1.1',
        receiveAmount: '1',
        token: gasBalance.token,
      },
    })
    expect(fee).toBeDefined()
    expect(Number(fee)).toBeGreaterThan(0)
  }, 60000)

  it('Should be able to calculate bridge NEO fee', async () => {
    const fee = await neo3NeoXBridgeService.calculateFee({
      account,
      receiverAddress,
      validatedInputs: {
        amount: '1',
        receiveAmount: '1',
        token: neoBalance.token,
      },
    })
    expect(fee).toBeDefined()
    expect(Number(fee)).toBeGreaterThan(0)
  }, 60000)

  it('Should be able to calculate max amount to bridge', async () => {
    const maxAmount = await neo3NeoXBridgeService.calculateMaxAmount({
      account,
      receiverAddress,
      token: gasBalance.token,
      balances,
    })

    expect(maxAmount).toBeDefined()
    expect(Number(maxAmount)).toBeLessThanOrEqual(Number(gasBalance.amount))

    await expect(
      neo3NeoXBridgeService.validateInputs({
        amount: maxAmount,
        token: gasBalance.token,
        balances,
        account,
        receiverAddress,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        receiveAmount: BSBigNumberHelper.fromNumber(maxAmount).minus(neo3NeoXBridgeService.BRIDGE_GAS_FEE).toString(),
        token: gasBalance.token,
      })
    )
  })

  it.skip('Should be able to bridge GAS', async () => {
    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)

    const maxAmount = await neo3NeoXBridgeService.calculateMaxAmount({
      account,
      receiverAddress,
      token: gasBalance.token,
      balances,
    })

    const validatedInputs = await neo3NeoXBridgeService.validateInputs({
      amount: maxAmount,
      token: gasBalance.token,
      balances,
      account,
      receiverAddress,
    })

    const transactionHash = await neo3NeoXBridgeService.bridge({
      account,
      receiverAddress,
      validatedInputs,
    })

    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to bridge NEO', async () => {
    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)
    const validatedInputs = await neo3NeoXBridgeService.validateInputs({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      receiverAddress,
    })

    const transactionHash = await neo3NeoXBridgeService.bridge({
      account,
      receiverAddress,
      validatedInputs,
    })
    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to wait for bridge', async () => {
    const validatedInputs = await neo3NeoXBridgeService.validateInputs({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      receiverAddress,
    })

    const transactionHash = await neo3NeoXBridgeService.bridge({
      account,
      receiverAddress,
      validatedInputs,
    })

    expect(transactionHash).toBeDefined()

    const waitForBridge = await neo3NeoXBridgeService.wait({
      transactionHash,
      validatedInputs,
    })

    expect(waitForBridge).toBeDefined()
  }, 60000)
})
