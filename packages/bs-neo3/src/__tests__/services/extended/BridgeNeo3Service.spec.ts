import { Account, BalanceResponse, BSBigNumberHelper, BSError } from '@cityofzion/blockchain-service'

import { BridgeNeo3Service } from '../../../services/extended/BridgeNeo3Service'
import { BSNeo3 } from '../../../BSNeo3'
import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { BSNeoX, BSNeoXConstants } from '@cityofzion/bs-neox'

let bridgeNeo3Service: BridgeNeo3Service<'neo3'>
let bsNeo3Service: BSNeo3<'neo3'>
let account: Account<'neo3'>
let balances: BalanceResponse[]
let gasBalance: BalanceResponse
let neoBalance: BalanceResponse

const neoXAddress = '0x5C2b22EcC2660187BEE0A4B737e4d93283270dEA'
const network = BSNeo3Constants.MAINNET_NETWORKS[0]

describe.skip('BridgeNeoXService', () => {
  beforeAll(async () => {
    if (!process.env.TEST_BRIDGE_NEOX_ADDRESS) {
      throw new Error('NeoX address not found in environment variables')
    }

    if (!process.env.TEST_BRIDGE_PRIVATE_KEY) {
      throw new Error('Private key not found in environment variables')
    }

    bsNeo3Service = new BSNeo3('neo3', network)
    bridgeNeo3Service = new BridgeNeo3Service(bsNeo3Service)

    account = bsNeo3Service.generateAccountFromKey(process.env.TEST_BRIDGE_PRIVATE_KEY as string)

    balances = await bsNeo3Service.blockchainDataService.getBalance(account.address)
    balances.push({
      token: BSNeo3Constants.NEO_TOKEN,
      amount: '1',
    })

    gasBalance = balances.find(balance => balance.token.hash === BSNeo3Constants.GAS_TOKEN.hash)!
    if (!gasBalance) {
      throw new Error('Gas balance not found')
    }

    neoBalance = balances.find(balance => balance.token.hash === BSNeo3Constants.NEO_TOKEN.hash)!
    if (!neoBalance) {
      throw new Error('NEO balance not found')
    }
  }, 60000)

  it('Should not be able to validate bridge using a token different of GAS or NEO', async () => {
    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '1.0',
        token: { decimals: 8, hash: 'non-existent', name: '-', symbol: '-' },
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN'))
  }, 60000)

  it('Should not be able to validate bridge if GAS balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeo3Constants.GAS_TOKEN.hash)

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '1.0',
        token: gasBalance.token,
        balances: filteredBalances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is less than the minimum amount plus bridge fee', async () => {
    const minAmount = (BSNeo3Constants.BRIDGE_MIN_AMOUNT - 0.1).toString()

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: minAmount,
        token: gasBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance', async () => {
    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: BSBigNumberHelper.fromNumber(gasBalance.amount).plus(1).toString(),
        token: gasBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge GAS if amount is greater than balance plus fee', async () => {
    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: gasBalance.amount,
        token: gasBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if NEO balance not found', async () => {
    const filteredBalances = balances.filter(balance => balance.token.hash !== BSNeo3Constants.NEO_TOKEN.hash)

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '1',
        token: neoBalance.token,
        balances: filteredBalances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('NEO balance not found', 'NEO_BALANCE_NOT_FOUND'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is less than the minimum amount', async () => {
    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '0',
        token: neoBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW'))
  }, 60000)

  it('Should not be able to validate bridge NEO if amount is greater than balance', async () => {
    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: BSBigNumberHelper.fromNumber(neoBalance.amount).plus(1).toString(),
        token: neoBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than bridge fee', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0' }]

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE'))
  }, 60000)

  it('Should not be able to validate bridge NEO if gas balance is less than fees', async () => {
    const lowGasBalances = [neoBalance, { ...gasBalance, amount: '0.101' }]

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: '1',
        token: neoBalance.token,
        balances: lowGasBalances,
        account,
        neoXAddress,
      })
    ).rejects.toThrow(new BSError('GAS balance is less than fees', 'INSUFFICIENT_GAS_BALANCE_FEES'))
  }, 60000)

  it('Should be able to validate bridge GAS', async () => {
    const validatedAmounts = await bridgeNeo3Service.validateBridgeToNeoX({
      amount: '1.1',
      token: gasBalance.token,
      balances,
      account,
      neoXAddress,
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
    const validatedAmounts = await bridgeNeo3Service.validateBridgeToNeoX({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      neoXAddress,
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
    const fee = await bridgeNeo3Service.calculateBridgeToNeoXFee({
      account,
      neoXAddress,
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
    const fee = await bridgeNeo3Service.calculateBridgeToNeoXFee({
      account,
      neoXAddress,
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
    const maxAmount = await bridgeNeo3Service.calculateMaxAmountToBridgeToNeoX({
      account,
      neoXAddress,
      token: gasBalance.token,
      balances,
    })

    expect(maxAmount).toBeDefined()
    expect(Number(maxAmount)).toBeLessThanOrEqual(Number(gasBalance.amount))

    await expect(
      bridgeNeo3Service.validateBridgeToNeoX({
        amount: maxAmount,
        token: gasBalance.token,
        balances,
        account,
        neoXAddress,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        receiveAmount: BSBigNumberHelper.fromNumber(maxAmount).minus(BSNeo3Constants.BRIDGE_GAS_FEE).toString(),
        token: gasBalance.token,
        isGasToken: true,
      })
    )
  })

  it.skip('Should be able to bridge GAS', async () => {
    const maxAmount = await bridgeNeo3Service.calculateMaxAmountToBridgeToNeoX({
      account,
      neoXAddress,
      token: gasBalance.token,
      balances,
    })

    const validateResult = await bridgeNeo3Service.validateBridgeToNeoX({
      amount: maxAmount,
      token: gasBalance.token,
      balances,
      account,
      neoXAddress,
    })

    const transactionHash = await bridgeNeo3Service.bridgeToNeoX({
      account,
      neoXAddress,
      validateResult,
    })

    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to bridge NEO', async () => {
    const validateResult = await bridgeNeo3Service.validateBridgeToNeoX({
      amount: '1',
      token: neoBalance.token,
      balances,
      account,
      neoXAddress,
    })

    const transactionHash = await bridgeNeo3Service.bridgeToNeoX({
      account,
      neoXAddress,
      validateResult,
    })
    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to wait for bridge', async () => {
    const validateResult = await bridgeNeo3Service.validateBridgeToNeoX({
      amount: '1.1',
      token: gasBalance.token,
      balances,
      account,
      neoXAddress,
    })

    const transactionHash = await bridgeNeo3Service.bridgeToNeoX({
      account,
      neoXAddress,
      validateResult,
    })

    expect(transactionHash).toBeDefined()

    const waitResult = await bridgeNeo3Service.waitForBridgeToNeoX({
      transactionHash,
      neoXService: new BSNeoX('neox', BSNeoXConstants.MAINNET_NETWORKS[0]),
      validateResult: validateResult,
    })

    expect(waitResult).toBeTruthy()
  }, 300000)
})
