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

const neoxTestnetNetwork = BSNeoXConstants.TESTNET_NETWORK
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
    const txId = '0x2d0ba54c93927a190f8b867c117738c3f577a4e2d9c115292818c39a31c0b166'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '0.000001',
        contractHash: '-',
        from: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        to: '0x3A2fF99807d6ae553eBB72456ACE0BcE0eCe7174',
        type: 'token',
        token: {
          decimals: 18,
          hash: '-',
          name: 'GAS',
          symbol: 'GAS',
        },
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 207518,
      hash: txId,
      notifications: [],
      time: 1723050418,
      transfers: expectedTransfer,
      fee: '0.00084',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  }, 10000)

  it('Should return transaction details for ERC-20 assets (Ethereum assets)', async () => {
    const txId = '0x8ff7f8d3ec44f35242a9e077658c63db595bf4023b3075df5b2b4fea54fd6861'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '37.0',
        contractHash: '0xEe576DAEe3A7a8d3773295525516086a527A9C8B',
        from: '0xe1db37AE18852C647257E30c6f276f0DbaFC6D47',
        to: '0x0000000000000000000000000000000000000000',
        token: {
          decimals: 18,
          hash: '0xEe576DAEe3A7a8d3773295525516086a527A9C8B',
          name: 'Aave Ethereum Variable Debt DAI',
          symbol: 'variableDebtEthDAI',
        },
        type: 'token',
      },
      {
        amount: '37.000009918050911441',
        contractHash: '0xfd49bEe9a0015743f4f1ce493804b203eca76f29',
        from: '0xe1db37AE18852C647257E30c6f276f0DbaFC6D47',
        to: '0x5Ddc109b3e30D8E90b5c59221D5Cc214149c46fB',
        type: 'token',
        token: {
          decimals: 18,
          hash: '0xfd49bEe9a0015743f4f1ce493804b203eca76f29',
          name: 'DAI',
          symbol: 'DAI',
        },
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 208007,
      hash: txId,
      notifications: [],
      time: 1723055774,
      transfers: expectedTransfer,
      fee: '0.00748844',
    }

    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  }, 10000)

  it('Should return transactions by address', async () => {
    const address = '0x5E1BE25D4A2De0083012f1B5A8030a7023fFA5bc'

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
    const tokenHash = '0x0F02E6BE5c77bD641A2138c988913900DD5f9A94'

    const expectedToken = {
      decimals: 18,
      hash: tokenHash,
      name: 'USDT',
      symbol: 'USDT',
    }

    const token = await blockscoutBDSNeoX.getTokenInfo(tokenHash)

    expect(token).toEqual(expectedToken)
  })

  it('Should return balance', async () => {
    const address = '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5'

    const expectedBalance: BalanceResponse[] = [
      {
        amount: expect.any(String),
        token: {
          decimals: 18,
          hash: '-',
          name: 'GAS',
          symbol: 'GAS',
        },
      },
    ]

    const balance = await blockscoutBDSNeoX.getBalance(address)

    expect(balance).toEqual(expectedBalance)
  })

  it('Should return block height', async () => {
    const blockHeight = await blockscoutBDSNeoX.getBlockHeight()

    expect(blockHeight).toBeGreaterThan(0)
  }, 10000)
})
