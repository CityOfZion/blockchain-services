import { Account, BalanceResponse, BSBigNumberHelper, BSError } from '@cityofzion/blockchain-service'
import { BridgeNeoXService } from '../services/extended/BridgeNeoXService'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BSNeoX } from '../BSNeoX'
import { BSNeo3, BSNeo3Constants } from '@cityofzion/bs-neo3'

let bridgeNeoXService: BridgeNeoXService<'neox'>
let bsNeoXService: BSNeoX<'neox'>
let account: Account<'neox'>
let balances: BalanceResponse[]
let gasBalance: BalanceResponse
let neoBalance: BalanceResponse

const neo3Address = process.env.TEST_BRIDGE_NEO3_ADDRESS!
const network = BSNeoXConstants.MAINNET_NETWORKS[0]

describe.skip('BridgeNeoXService', () => {
  beforeAll(async () => {
    if (!process.env.TEST_BRIDGE_NEO3_ADDRESS) {
      throw new Error('Neo3 address not found in environment variables')
    }

    if (!process.env.TEST_BRIDGE_PRIVATE_KEY) {
      throw new Error('Bridge private key not found in environment variables')
    }

    bsNeoXService = new BSNeoX('neox', network)
    bridgeNeoXService = new BridgeNeoXService(bsNeoXService)
    account = bsNeoXService.generateAccountFromKey(process.env.TEST_BRIDGE_PRIVATE_KEY!)

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
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '1.0',
        token: { decimals: 8, hash: 'non-existent', name: 'non-existent', symbol: 'non-existent' },
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN'))
  }, 60000)

  it('Should not be able to validate bridge if GAS balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeoXConstants.NATIVE_ASSET.hash)

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '1.0',
        token: gasBalance.token,
        balances: filteredBalances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is less than the minimum amount plus bridge fee', async () => {
    const minAmount = (bridgeNeoXService.BRIDGE_MIN_AMOUNT - 0.1).toString()

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: minAmount,
        token: gasBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance', async () => {
    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: BSBigNumberHelper.fromNumber(gasBalance.amount).plus(1).toString(),
        token: gasBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance plus fee', async () => {
    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: gasBalance.amount,
        token: gasBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if NEO balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeoXConstants.NEO_TOKEN.hash)

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '1',
        token: neoBalance.token,
        balances: filteredBalances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('NEO balance not found', 'NEO_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is less than the minimum amount', async () => {
    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '0',
        token: neoBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is greater than balance', async () => {
    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: BSBigNumberHelper.fromNumber(neoBalance.amount).plus(1).toString(),
        token: neoBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than bridge fee', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0' }]

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than fees', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0.101' }]

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        neo3Address,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than fees', 'INSUFFICIENT_GAS_BALANCE_FEES'))
  }, 60000)

  it('Should be able to validate bridge GAS', async () => {
    const validatedAmounts = await bridgeNeoXService.validateBridgeToNeo3({
      amount: '1.1',
      token: gasBalance.token,
      balances,
      account,
      neo3Address,
    })

    expect(validatedAmounts).toEqual({
      amount: '1.1',
      receiveAmount: '1',
      token: gasBalance.token,
      isGasToken: true,
      isNeoToken: false,
    })
  })

  it('Should be able to validate bridge NEO', async () => {
    const validatedAmounts = await bridgeNeoXService.validateBridgeToNeo3({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      neo3Address,
    })
    expect(validatedAmounts).toEqual({
      amount: '1',
      receiveAmount: '1',
      token: neoBalance.token,
      isNeoToken: true,
      isGasToken: false,
    })
  })

  it('Should be able to calculate bridge GAS fee', async () => {
    const fee = await bridgeNeoXService.calculateBridgeToNeo3Fee({
      account,
      neo3Address,
      validateResult: {
        amount: '1.1',
        receiveAmount: '1',
        token: gasBalance.token,
        isGasToken: true,
        isNeoToken: false,
      },
    })
    expect(fee).toBeDefined()
    expect(Number(fee)).toBeGreaterThan(0)
  }, 60000)

  it('Should be able to calculate bridge NEO fee', async () => {
    const fee = await bridgeNeoXService.calculateBridgeToNeo3Fee({
      account,
      neo3Address,
      validateResult: {
        amount: '1',
        receiveAmount: '1',
        token: neoBalance.token,
        isGasToken: false,
        isNeoToken: true,
      },
    })
    expect(fee).toBeDefined()
    expect(Number(fee)).toBeGreaterThan(0)
  }, 60000)

  it('Should be able to calculate max amount to bridge', async () => {
    const maxAmount = await bridgeNeoXService.calculateMaxAmountToBridgeToNeoX({
      account,
      neo3Address,
      token: gasBalance.token,
      balances,
    })

    expect(maxAmount).toBeDefined()
    expect(Number(maxAmount)).toBeLessThanOrEqual(Number(gasBalance.amount))

    await expect(
      bridgeNeoXService.validateBridgeToNeo3({
        amount: maxAmount,
        token: gasBalance.token,
        balances,
        account,
        neo3Address,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        receiveAmount: BSBigNumberHelper.fromNumber(maxAmount).minus(bridgeNeoXService.BRIDGE_GAS_FEE).toString(),
        token: gasBalance.token,
        isGasToken: true,
      })
    )
  })

  it.skip('Should be able to bridge GAS', async () => {
    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)

    const maxAmount = await bridgeNeoXService.calculateMaxAmountToBridgeToNeoX({
      account,
      neo3Address,
      token: gasBalance.token,
      balances,
    })

    const validateResult = await bridgeNeoXService.validateBridgeToNeo3({
      amount: maxAmount,
      token: gasBalance.token,
      balances,
      account,
      neo3Address,
    })

    const transactionHash = await bridgeNeoXService.bridgeToNeo3({
      account,
      neo3Address,
      validateResult,
    })

    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to bridge NEO', async () => {
    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)
    const validateResult = await bridgeNeoXService.validateBridgeToNeo3({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      neo3Address,
    })

    const transactionHash = await bridgeNeoXService.bridgeToNeo3({
      account,
      neo3Address,
      validateResult,
    })
    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to wait for bridge', async () => {
    const validateResult = await bridgeNeoXService.validateBridgeToNeo3({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      neo3Address,
    })

    const transactionHash = await bridgeNeoXService.bridgeToNeo3({
      account,
      neo3Address,
      validateResult,
    })

    expect(transactionHash).toBeDefined()

    const waitForBridge = await bridgeNeoXService.waitForBridgeToNeoX({
      neo3Service: new BSNeo3('neo3', BSNeo3Constants.MAINNET_NETWORKS[0]),
      transactionHash: '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b',
      validateResult,
    })

    expect(waitForBridge).toBeDefined()
  }, 60000)
})
