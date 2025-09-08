import { Account, BSBigNumberHelper, BSError, TBridgeToken } from '@cityofzion/blockchain-service'

import { BSNeo3 } from '../../../BSNeo3'
import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { Neo3NeoXBridgeService } from '../../../services/neo3neoXBridge/Neo3NeoXBridgeService'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import { DoraNeoRest } from '../../../services/blockchain-data/DoraBDSNeo3'
import axios from 'axios'
import { TokenServiceNeo3 } from '../../../services/token/TokenServiceNeo3'

let neo3NeoXBridgeService: Neo3NeoXBridgeService<'neo3'>
let bsNeo3Service: BSNeo3<'neo3'>
let account: Account<'neo3'>
let receiverAddress: string
let gasToken: TBridgeToken<'neo3'>
let neoToken: TBridgeToken<'neo3'>

const network = BSNeo3Constants.DEFAULT_NETWORK
const tokenService = new TokenServiceNeo3()

describe('Neo3NeoXBridgeService', () => {
  beforeAll(async () => {
    receiverAddress = process.env.TEST_BRIDGE_NEOX_ADDRESS
    bsNeo3Service = new BSNeo3('neo3', network)
    neo3NeoXBridgeService = new Neo3NeoXBridgeService(bsNeo3Service)

    account = bsNeo3Service.generateAccountFromKey(process.env.TEST_BRIDGE_PRIVATE_KEY)

    gasToken = neo3NeoXBridgeService.tokens.find(token =>
      tokenService.predicateByHash(BSNeo3Constants.GAS_TOKEN, token)
    )!

    neoToken = neo3NeoXBridgeService.tokens.find(token =>
      tokenService.predicateByHash(BSNeo3Constants.NEO_TOKEN, token)
    )!
  }, 60000)

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Should not be able to get bridge constants for a invalid `testInvoke` response', async () => {
    const invalidResponse = {
      stack: [
        { type: 'ByteArray', value: 'invalid' },
        { type: 'ByteArray', value: 'invalid' },
        { type: 'ByteArray', value: 'invalid' },
      ],
    }

    jest.spyOn(NeonInvoker.prototype, 'testInvoke').mockResolvedValue(invalidResponse as any)

    await expect(neo3NeoXBridgeService.getBridgeConstants(gasToken)).rejects.toThrow(BSError)
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

  it('Should not be able to get the approval fee', async () => {
    await expect(neo3NeoXBridgeService.getApprovalFee()).rejects.toThrow(BSError)
  })

  it('Should be able to get the nonce of a non-existent transaction', async () => {
    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: 'invalid-transaction-hash',
      })
    ).rejects.toThrow(new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE'))
  })

  it('Should be able to get the nonce of a invalid transaction vmState', async () => {
    jest.spyOn(DoraNeoRest, 'log').mockResolvedValue({ vmstate: 'FAULT' } as any)

    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: 'invalid-transaction-hash',
      })
    ).rejects.toThrow(new BSError('Transaction invalid', 'INVALID_TRANSACTION'))
  })

  it('Should not be able to get the nonce of a non-bridge transaction', async () => {
    await expect(
      neo3NeoXBridgeService.getNonce({
        token: gasToken,
        transactionHash: '0x0d4daca576d1c8b17d2ed3fc2e33e8bf560af0798c0b46b6b20eab456e36d005',
      })
    ).rejects.toThrow(new BSError('Nonce not found in transaction log', 'NONCE_NOT_FOUND'))
  })

  it('Should be able to get the nonce of a GAS bridge', async () => {
    const nonce = await neo3NeoXBridgeService.getNonce({
      token: gasToken,
      transactionHash: '0xed5bd564f2ea38888aaec988bec6893e1b72811579864b0a3bc6ec02619e23dc',
    })

    expect(nonce).toBe('1421')
  })

  it('Should be able to get the nonce of a NEO bridge', async () => {
    const nonce = await neo3NeoXBridgeService.getNonce({
      token: neoToken,
      transactionHash: '0x89512343681ca92fe4965d1fc6f71a2586a74c6d4592357f5fd5f540c0891b66',
    })

    expect(nonce).toBe('35')
  })

  it('Should not be able to get the transaction hash by nonce', async () => {
    await expect(
      neo3NeoXBridgeService.getTransactionHashByNonce({
        token: gasToken,
        nonce: 'non-existing-nonce',
      })
    ).rejects.toThrow(new BSError('Failed to get transaction by nonce', 'FAILED_TO_GET_TRANSACTION_BY_NONCE'))
  })

  it('Should be able to get the transaction hash by nonce for a invalid transaction vmState', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { result: { Vmstate: 'FAULT' } } } as any)

    await expect(
      neo3NeoXBridgeService.getTransactionHashByNonce({
        token: gasToken,
        nonce: '761',
      })
    ).rejects.toThrow(new BSError('Transaction invalid', 'INVALID_TRANSACTION'))
  })

  it('Should be able to get the transaction hash by nonce', async () => {
    const transactionHash = await neo3NeoXBridgeService.getTransactionHashByNonce({
      token: gasToken,
      nonce: '761',
    })

    expect(transactionHash).toBe('0x17ac3ee5939791ec82ae8bab8f5722ecb66edb250db72417fb3f2e57c1b239d9')
  })

  it.skip('Should be able to bridge GAS', async () => {
    const { bridgeFee, bridgeMinAmount } = await neo3NeoXBridgeService.getBridgeConstants(gasToken)

    const balances = await bsNeo3Service.blockchainDataService.getBalance(account.address)

    const gasBalance = balances.find(balance => tokenService.predicateByHash(gasToken, balance.token))

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

    const balances = await bsNeo3Service.blockchainDataService.getBalance(account.address)

    const neoBalance = balances.find(balance => tokenService.predicateByHash(neoToken, balance.token))

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
