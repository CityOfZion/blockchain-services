import {
  BalanceResponse,
  ExplorerService,
  NftDataService,
  TransactionResponse,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'
import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BlockscoutBDSNeoX } from '../services/blockchain-data/BlockscoutBDSNeoX'

const neoxTestnetNetwork = BSNeoXConstants.MAINNET_NETWORKS[0]
let nftDataService: NftDataService
let explorerService: ExplorerService
let blockscoutBDSNeoX: BlockscoutBDSNeoX

describe('BlockscoutBDSNeoX', () => {
  beforeEach(() => {
    nftDataService = new GhostMarketNDSNeoX(neoxTestnetNetwork)
    explorerService = new BlockscoutESNeoX(neoxTestnetNetwork)
    blockscoutBDSNeoX = new BlockscoutBDSNeoX(neoxTestnetNetwork, nftDataService, explorerService)
  })

  it('Should return transaction details for native assets (GAS)', async () => {
    const txId = '0x31c4c688c4e41e9213cdcbb7870be49d146ee7b89e3f9d39e91a0a268fc22ac8'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '0.05',
        contractHash: BSNeoXConstants.NATIVE_ASSET.hash,
        from: '0xD1D6634415Be11A54664298373C57c131aA828d5',
        to: '0x07ca54b301dECA9C8Bc9AF4e4Cd6A87531018031',
        type: 'token',
        token: BSNeoXConstants.NATIVE_ASSET,
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 3449529,
      hash: txId,
      notifications: [],
      time: 1755720556,
      transfers: expectedTransfer,
      fee: '0.000924',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transaction details for ERC-20 assets (Ethereum assets)', async () => {
    const txId = '0xe0ed57295686a30f72352bdd178d72eb84071d1f4b654df2e4241fb5ba2eb76d'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '1.0',
        contractHash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
        from: '0x1212000000000000000000000000000000000004',
        to: '0xe94bea1d8BB8BCC13CD6974E6941f4D1896d56da',
        token: {
          decimals: 18,
          hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
          name: 'NeoToken',
          symbol: 'NEO',
        },
        type: 'token',
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 3387699,
      hash: txId,
      notifications: [],
      time: 1755100060,
      transfers: expectedTransfer,
      fee: '0.0064436',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transactions by address', async () => {
    const address = '0x1212000000000000000000000000000000000004'

    const expectedResponse: TransactionsByAddressResponse = {
      transactions: expect.arrayContaining([
        expect.objectContaining({
          block: expect.any(Number),
          fee: expect.any(String),
          hash: expect.any(String),
          notifications: expect.any(Array),
          time: expect.any(Number),
          transfers: expect.any(Array),
        }),
      ]),
      nextPageParams: expect.any(Object),
    }

    const transactions = await blockscoutBDSNeoX.getTransactionsByAddress({ address })

    expect(transactions).toEqual(expectedResponse)
  })

  it('Should return token info', async () => {
    const tokenHash = '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f'

    const expectedToken = {
      decimals: 18,
      hash: tokenHash,
      name: 'NeoToken',
      symbol: 'NEO',
    }

    const token = await blockscoutBDSNeoX.getTokenInfo(tokenHash)

    expect(token).toEqual(expectedToken)
  })

  it('Should return balance', async () => {
    const address = '0xd1d6634415be11a54664298373c57c131aa828d5'

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
