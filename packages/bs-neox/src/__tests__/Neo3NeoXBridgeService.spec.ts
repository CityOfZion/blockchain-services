import { Account, BSBigNumberHelper, BSError, TBridgeToken } from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BSNeoX } from '../BSNeoX'
import { Neo3NeoXBridgeService } from '../services/neo3neoXBridge/Neo3NeoXBridgeService'
import { ethers } from 'ethers'
import { TokenServiceEthereum } from '@cityofzion/bs-ethereum'

let neo3NeoXBridgeService: Neo3NeoXBridgeService<'neox'>
let bsNeoXService: BSNeoX<'neox'>
let account: Account<'neox'>
let receiverAddress: string
let gasToken: TBridgeToken<'neox'>
let neoToken: TBridgeToken<'neox'>

const network = BSNeoXConstants.DEFAULT_NETWORK
const tokenService = new TokenServiceEthereum()

describe('Neo3NeoXBridgeService', () => {
  beforeAll(async () => {
    receiverAddress = process.env.TEST_BRIDGE_NEO3_ADDRESS
    bsNeoXService = new BSNeoX('neox', network)
    neo3NeoXBridgeService = new Neo3NeoXBridgeService(bsNeoXService)

    account = bsNeoXService.generateAccountFromKey(process.env.TEST_BRIDGE_PRIVATE_KEY)

    gasToken = neo3NeoXBridgeService.tokens.find(token =>
      tokenService.predicateByHash(BSNeoXConstants.NATIVE_ASSET.hash, token.hash)
    )!

    neoToken = neo3NeoXBridgeService.tokens.find(token =>
      tokenService.predicateByHash(BSNeoXConstants.NEO_TOKEN.hash, token.hash)
    )!
  }, 60000)

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Should be able to get the NEO bridge constants', async () => {
    const constants = await neo3NeoXBridgeService.getBridgeConstants(neoToken)

    expect(constants).toEqual({
      bridgeFee: expect.any(String),
      bridgeMinAmount: expect.any(String),
      bridgeMaxAmount: expect.any(String),
    })

    expect(Number(constants.bridgeFee)).toBeGreaterThan(0)
    expect(Number(constants.bridgeMinAmount)).toBeGreaterThan(0)
    expect(Number(constants.bridgeMaxAmount)).toBeGreaterThan(0)
  })

  it('Should be able to get the GAS bridge constants', async () => {
    const constants = await neo3NeoXBridgeService.getBridgeConstants(gasToken)

    expect(constants).toEqual({
      bridgeFee: expect.any(String),
      bridgeMinAmount: expect.any(String),
      bridgeMaxAmount: expect.any(String),
    })

    expect(Number(constants.bridgeFee)).toBeGreaterThan(0)
    expect(Number(constants.bridgeMinAmount)).toBeGreaterThan(0)
    expect(Number(constants.bridgeMaxAmount)).toBeGreaterThan(0)
  })

  it('Should not be able to get the approval fee for GAS bridge', async () => {
    await expect(neo3NeoXBridgeService.getApprovalFee({ account, amount: '1', token: gasToken })).rejects.toThrow(
      new BSError('No allowance fee for native token', 'NO_ALLOWANCE_FEE')
    )
  })

  it('Should not be able to get the approval fee for NEO bridge when it is already approved', async () => {
    const allowanceMock = jest.fn().mockResolvedValue(ethers.BigNumber.from('1000000000000000000'))
    jest.spyOn(ethers, 'Contract').mockImplementation(
      () =>
        ({
          allowance: allowanceMock,
        }) as any
    )

    await expect(neo3NeoXBridgeService.getApprovalFee({ account, amount: '1', token: neoToken })).rejects.toThrow(
      new BSError('Allowance is already sufficient', 'ALLOWANCE_ALREADY_SUFFICIENT')
    )
  })

  it('Should be able to get the approval fee for NEO bridge', async () => {
    const approvalFee = await neo3NeoXBridgeService.getApprovalFee({
      account,
      amount: '1',
      token: neoToken,
    })

    expect(approvalFee).toBeDefined()
    expect(Number(approvalFee)).toBeGreaterThan(0)
  })

  it('Should not be able to get the nonce of a not found transaction', async () => {
    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: 'invalid-transaction-hash',
      })
    ).rejects.toThrow(new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE'))
  })

  it('Should not be able to get the nonce of a invalid transaction', async () => {
    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: '0xddd182be1bf9e4d9d3098eeb7b67ef9b883c1a5019c8fa716e8db2423bab0e91',
      })
    ).rejects.toThrow(new BSError('Transaction invalid', 'INVALID_TRANSACTION'))
  })

  it('Should not be able to get the nonce of a non-bridge transaction', async () => {
    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: '0x1b644eeab5df6b840c03228d609138858e23c730af81afc74a9018fe375266df',
      })
    ).rejects.toThrow(new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE'))
  })

  it('Should be able to get the nonce of a GAS bridge', async () => {
    const nonce = await neo3NeoXBridgeService.getNonce({
      token: gasToken,
      transactionHash: '0x6369f5b1adb5d948b0cb65a5250cab0f4c4f97aa5d2544dec13afefe9393227f',
    })

    expect(nonce).toBe('761')
  })

  it('Should be able to get the nonce of a NEO bridge', async () => {
    const nonce = await neo3NeoXBridgeService.getNonce({
      token: neoToken,
      transactionHash: '0x1952f45ce753b9f280e5ad743b4e481ca0c8a380465a17f29df5ef6319528abf',
    })

    expect(nonce).toBe('1420')
  }, 60000)

  it('Should not be able to get the transaction hash by invalid nonce', async () => {
    await expect(
      neo3NeoXBridgeService.getTransactionHashByNonce({
        token: gasToken,
        nonce: 'non-existing-nonce',
      })
    ).rejects.toThrow(new BSError('Transaction ID not found in response', 'TXID_NOT_FOUND'))
  })

  it('Should not be able to get the transaction hash by non-existent nonce', async () => {
    await expect(
      neo3NeoXBridgeService.getTransactionHashByNonce({
        token: gasToken,
        nonce: '1000',
      })
    ).rejects.toThrow(new BSError('Transaction ID not found in response', 'TXID_NOT_FOUND'))
  })

  it('Should be able to get the transaction hash by nonce', async () => {
    const transactionHash = await neo3NeoXBridgeService.getTransactionHashByNonce({
      token: neoToken,
      nonce: '35',
    })

    expect(transactionHash).toBe('0xe1d296d0bbff5239b76386dc2e0a2d55322c1ac08eb7291ec2545a2b9dab7ae4')
  })

  it.skip('Should be able to bridge GAS', async () => {
    const { bridgeFee, bridgeMinAmount } = await neo3NeoXBridgeService.getBridgeConstants(gasToken)

    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)

    const gasBalance = balances.find(balance => tokenService.predicateByHash(gasToken.hash, balance.token.hash))

    if (!gasBalance) {
      throw new Error('It seems you do not have GAS balance to bridge')
    }

    expect(BSBigNumberHelper.fromNumber(gasBalance.amount).isGreaterThan(bridgeMinAmount)).toBe(true)

    const transactionHash = await neo3NeoXBridgeService.bridge({
      account,
      receiverAddress,
      amount: bridgeMinAmount,
      token: gasToken,
      bridgeFee,
    })

    expect(transactionHash).toBeDefined()
  }, 60000)

  it.skip('Should be able to bridge NEO', async () => {
    const { bridgeFee, bridgeMinAmount } = await neo3NeoXBridgeService.getBridgeConstants(neoToken)

    const balances = await bsNeoXService.blockchainDataService.getBalance(account.address)

    const neoBalance = balances.find(balance => tokenService.predicateByHash(neoToken.hash, balance.token.hash))

    if (!neoBalance) {
      throw new Error('It seems you do not have GAS balance to bridge')
    }

    expect(BSBigNumberHelper.fromNumber(neoBalance.amount).isGreaterThan(bridgeMinAmount)).toBe(true)

    const transactionHash = await neo3NeoXBridgeService.bridge({
      account,
      receiverAddress,
      amount: bridgeMinAmount,
      token: neoToken,
      bridgeFee,
    })

    expect(transactionHash).toBeDefined()
  }, 60000)
})
