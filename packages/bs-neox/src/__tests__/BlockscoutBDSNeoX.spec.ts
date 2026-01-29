import { BSNeoXConstants } from '../constants/BSNeoXConstants'

import { BlockscoutBDSNeoX } from '../services/blockchain-data/BlockscoutBDSNeoX'

import { BSNeoX } from '../BSNeoX'
import type { TTransaction, TTransactionBridgeNeo3NeoX } from '@cityofzion/blockchain-service'

let service: BSNeoX<'test'>
let blockscoutBDSNeoX: BlockscoutBDSNeoX<'test'>

describe('BlockscoutBDSNeoX', () => {
  beforeEach(() => {
    service = new BSNeoX('test')
    blockscoutBDSNeoX = new BlockscoutBDSNeoX(service)
  })

  it('Should return transaction details for native assets (GAS)', async () => {
    const txId = '0xbc669a1084f69a69f0b7bf10ee160265fbd548c15b05b41d9de386c8cb51290a'

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: 3561140,
        txId,
        date: expect.any(String),
        events: [
          {
            amount: '3.045',
            contractHash: BSNeoXConstants.NATIVE_ASSET.hash,
            from: '0x11c5fE402fd39698d1144AD027A2fF2471d723af',
            to: '0xc17f96Dba5358a86659de53F7F1ab6D9227C8174',
            eventType: 'token',
            token: BSNeoXConstants.NATIVE_ASSET,
            methodName: 'transfer',
            tokenType: 'native',
            contractHashUrl: expect.any(String),
            fromUrl: expect.any(String),
            toUrl: expect.any(String),
          },
        ],
        networkFeeAmount: '0.00084',
        systemFeeAmount: '0.0',
        invocationCount: 0,
        notificationCount: 0,
        txIdUrl: expect.any(String),
        type: 'default',
      })
    )
  })

  it('Should return transaction details for ERC-20 assets (Ethereum assets)', async () => {
    const txId = '0x055a176ae9f0c950584bac1ebc93abb0e52160914e40f9288c69f90e47bd8cee'

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: 3415495,
        txId,
        txIdUrl: expect.any(String),
        date: expect.any(String),
        events: [
          {
            amount: '500000.0',
            contractHash: '0xE816deE05cf6D0F2a57EB4C489241D8326B5d106',
            from: '0x1C3ac630a715Aa8fFbb5e182716196F0153C372D',
            to: '0xE78FD95780d54E63cC4c1D0Df7DbC4487a6C72D4',
            token: {
              decimals: 18,
              hash: '0xE816deE05cf6D0F2a57EB4C489241D8326B5d106',
              name: 'NeoDashboard MemeCoin',
              symbol: 'NDMEME',
            },
            eventType: 'token',
            methodName: 'transfer',
            tokenType: 'erc-20',
            contractHashUrl: expect.any(String),
            fromUrl: expect.any(String),
            toUrl: expect.any(String),
          },
        ],
        networkFeeAmount: '0.00218104',
        systemFeeAmount: '0.0',
        invocationCount: 0,
        notificationCount: 0,
        type: 'default',
      })
    )
  })

  it('Should return a bridge transaction details (GAS)', async () => {
    const transaction = (await blockscoutBDSNeoX.getTransaction(
      '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
    )) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.gasToken)
    expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
  })

  it('Should return a bridge transaction details (NEO)', async () => {
    const transaction = (await blockscoutBDSNeoX.getTransaction(
      '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
    )) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.neoToken)
    expect(transaction.data.receiverAddress).toBe('NLxVU1mCenEsCXgzDJcY7YF145ErGjx1W8')
  })

  it('Should return transactions by address', async () => {
    const address = '0x1241f44BFA102ab7386C784959BAe3D0fB923734'

    const transactions = await blockscoutBDSNeoX.getTransactionsByAddress({ address })

    transactions.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          invocationCount: expect.any(Number),
          notificationCount: expect.any(Number),
          networkFeeAmount: expect.anything(),
          systemFeeAmount: expect.anything(),
          type: expect.any(String),
          events: expect.arrayContaining([
            expect.objectContaining({
              eventType: expect.any(String),
              amount: expect.anything(),
              methodName: expect.any(String),
              from: expect.anything(),
              fromUrl: expect.anything(),
              to: expect.anything(),
              toUrl: expect.anything(),
              contractHash: expect.any(String),
              contractHashUrl: expect.any(String),
              token: expect.objectContaining({
                decimals: expect.any(Number),
                symbol: expect.any(String),
                name: expect.any(String),
                hash: expect.any(String),
              }),
              tokenType: expect.any(String),
            }),
          ]),
        })
      )
    })
  })

  it.skip('Should return transactions by address that are marked as bridge (GAS)', async () => {
    const response = await blockscoutBDSNeoX.getTransactionsByAddress({
      address: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
    })

    const transaction = response.transactions.find(
      ({ txId }) => txId === '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
    ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.gasToken)
    expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
  })

  it.skip('Should return transactions by address that are marked as bridge (NEO)', async () => {
    const response = await blockscoutBDSNeoX.getTransactionsByAddress({
      address: '0x5c2b22ecc2660187bee0a4b737e4d93283270dea',
    })

    const transaction = response.transactions.find(
      ({ txId }) => txId === '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
    ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.neoToken)
    expect(transaction.data.receiverAddress).toBe('NLxVU1mCenEsCXgzDJcY7YF145ErGjx1W8')
  })

  it('Should return token info', async () => {
    const tokenHash = '0xE816deE05cf6D0F2a57EB4C489241D8326B5d106'

    const expectedToken = {
      decimals: 18,
      hash: tokenHash,
      name: 'NeoDashboard MemeCoin',
      symbol: 'NDMEME',
    }

    const token = await blockscoutBDSNeoX.getTokenInfo(tokenHash)

    expect(token).toEqual(expectedToken)
  })

  it('Should return balance', async () => {
    const address = '0xa911a7FA0901Cfc3f1da55A05593823E32e2f1a9'

    const balance = await blockscoutBDSNeoX.getBalance(address)

    expect(balance).toEqual(
      expect.arrayContaining([
        {
          amount: expect.any(String),
          token: BSNeoXConstants.NATIVE_ASSET,
        },
      ])
    )
  })

  it('Should return block height', async () => {
    const blockHeight = await blockscoutBDSNeoX.getBlockHeight()

    expect(blockHeight).toBeGreaterThan(0)
  })
})
