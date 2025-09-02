import {
  BalanceResponse,
  ExplorerService,
  INeo3NeoXBridgeService,
  NftDataService,
  TBridgeToken,
  TransactionBridgeNeo3NeoXResponse,
  TransactionResponse,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'
import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BlockscoutBDSNeoX } from '../services/blockchain-data/BlockscoutBDSNeoX'
import { TokenServiceEthereum } from '@cityofzion/bs-ethereum'
import { Neo3NeoXBridgeService } from '../services/neo3neoXBridge/Neo3NeoXBridgeService'
import { BSNeoX } from '../BSNeoX'

const neoxMainnetNetwork = BSNeoXConstants.MAINNET_NETWORKS[0]
let nftDataService: NftDataService
let explorerService: ExplorerService
let blockscoutBDSNeoX: BlockscoutBDSNeoX
let neo3NeoXBridgeService: INeo3NeoXBridgeService

describe('BlockscoutBDSNeoX', () => {
  const bridgeGasToken: TBridgeToken<'neox'> = {
    ...BSNeoXConstants.NATIVE_ASSET,
    multichainId: 'gas',
    blockchain: 'neox',
  }

  const bridgeNeoToken: TBridgeToken<'neox'> = { ...BSNeoXConstants.NEO_TOKEN, multichainId: 'neo', blockchain: 'neox' }

  beforeEach(() => {
    const tokenService = new TokenServiceEthereum()

    nftDataService = new GhostMarketNDSNeoX(neoxMainnetNetwork)
    explorerService = new BlockscoutESNeoX(neoxMainnetNetwork, tokenService)
    neo3NeoXBridgeService = new Neo3NeoXBridgeService(new BSNeoX('neox', neoxMainnetNetwork))

    blockscoutBDSNeoX = new BlockscoutBDSNeoX(
      neoxMainnetNetwork,
      nftDataService,
      explorerService,
      tokenService,
      neo3NeoXBridgeService
    )
  })

  it('Should return transaction details for native assets (GAS)', async () => {
    const txId = '0xbc669a1084f69a69f0b7bf10ee160265fbd548c15b05b41d9de386c8cb51290a'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '3.045',
        contractHash: BSNeoXConstants.NATIVE_ASSET.hash,
        from: '0x11c5fE402fd39698d1144AD027A2fF2471d723af',
        to: '0xc17f96Dba5358a86659de53F7F1ab6D9227C8174',
        type: 'token',
        token: BSNeoXConstants.NATIVE_ASSET,
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 3561140,
      hash: txId,
      notifications: [],
      time: 1756725438,
      transfers: expectedTransfer,
      fee: '0.00084',
      type: 'default',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transaction details for ERC-20 assets (Ethereum assets)', async () => {
    const txId = '0x055a176ae9f0c950584bac1ebc93abb0e52160914e40f9288c69f90e47bd8cee'

    const expectedTransfer: TransactionTransferAsset[] = [
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
        type: 'token',
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 3415495,
      hash: txId,
      notifications: [],
      time: 1755425592,
      transfers: expectedTransfer,
      fee: '0.00218104',
      type: 'default',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return a bridge transaction details (GAS)', async () => {
    const transaction = (await blockscoutBDSNeoX.getTransaction(
      '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
    )) as TransactionResponse & TransactionBridgeNeo3NeoXResponse

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1.1')
    expect(transaction.data.token).toEqual(bridgeGasToken)
    expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
  }, 10000)

  it('Should return a bridge transaction details (NEO)', async () => {
    const transaction = (await blockscoutBDSNeoX.getTransaction(
      '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
    )) as TransactionResponse & TransactionBridgeNeo3NeoXResponse

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.token).toEqual(bridgeNeoToken)
    expect(transaction.data.receiverAddress).toBe('NLxVU1mCenEsCXgzDJcY7YF145ErGjx1W8')
  }, 10000)

  it('Should return transactions by address', async () => {
    const address = '0x1241f44BFA102ab7386C784959BAe3D0fB923734'

    const expectedResponse: TransactionsByAddressResponse = {
      transactions: expect.arrayContaining([
        expect.objectContaining({
          block: expect.any(Number),
          fee: expect.any(String),
          hash: expect.any(String),
          notifications: expect.any(Array),
          time: expect.any(Number),
          transfers: expect.any(Array),
          type: expect.any(String),
        }),
      ]),
      nextPageParams: expect.any(Object),
    }

    const transactions = await blockscoutBDSNeoX.getTransactionsByAddress({ address })

    expect(transactions).toEqual(expectedResponse)
  })

  it.skip('Should return transactions by address that are marked as bridge (GAS)', async () => {
    const response = await blockscoutBDSNeoX.getTransactionsByAddress({
      address: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
    })

    const transaction = response.transactions.find(
      ({ hash }) => hash === '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
    ) as TransactionResponse & TransactionBridgeNeo3NeoXResponse

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1.1')
    expect(transaction.data.token).toEqual(bridgeGasToken)
    expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
  })

  it.skip('Should return transactions by address that are marked as bridge (NEO)', async () => {
    const response = await blockscoutBDSNeoX.getTransactionsByAddress({
      address: '0x5c2b22ecc2660187bee0a4b737e4d93283270dea',
    })

    const transaction = response.transactions.find(
      ({ hash }) => hash === '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
    ) as TransactionResponse & TransactionBridgeNeo3NeoXResponse

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.token).toEqual(bridgeNeoToken)
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

    const expectedBalance: BalanceResponse[] = [
      {
        amount: expect.any(String),
        token: BSNeoXConstants.NATIVE_ASSET,
      },
    ]

    const balance = await blockscoutBDSNeoX.getBalance(address)

    expect(balance).toEqual(expectedBalance)
  })

  it('Should return block height', async () => {
    const blockHeight = await blockscoutBDSNeoX.getBlockHeight()

    expect(blockHeight).toBeGreaterThan(0)
  })
})
