import {
  BalanceResponse,
  TransactionResponse,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import { BlockscoutNeoXBDSEthereum } from '../BlockscoutNeoXBDSEthereum'
import { BSEthereumHelper } from '../BSEthereumHelper'

const network = BSEthereumHelper.TESTNET_NETWORKS.find(network => network.id === '12227332')!

describe('BlockscoutNeoXBDSEthereum', () => {
  it('Should return transaction details for native assets (GAS)', async () => {
    const txId = '0xd699caf2873c4ec900767ca2c1f519a85321d90a9bb6c2440117627ddaed6905'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '12.304193970691695151',
        contractHash: '-',
        from: '0xEEf3aA5b167081221aB0DB6999259973Fc502646',
        to: '0x7553c37E4C2EF96a41AB11F2813972711D1b73F9',
        type: 'token',
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 838903,
      hash: txId,
      notifications: [],
      time: 1721962138000 / 1000,
      transfers: expectedTransfer,
      fee: '0.004452',
    }

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transaction details for ERC-20 assets (Ethereum assets)', async () => {
    const txId = '0x2dddef0da23c82fd317317b79e0e1d14efab1df8d079f47262b26c0b29afdb95'

    const expectedTransfer: TransactionTransferAsset[] = [
      {
        amount: '3164.81',
        contractHash: '0x42aF6A3533173eb1BC6A05d5ab3A5184612A038c',
        from: '0xAa393A829CAC203a7216406041A4c6762bda2706',
        to: '0xFfab316a48d30d0EB55052DAb01f706F61E87568',
        type: 'token',
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 832605,
      hash: txId,
      notifications: [],
      time: 1721897573000 / 1000,
      transfers: expectedTransfer,
      fee: '0.016074688',
    }

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transaction details for ERC-721 assets (NFT)', async () => {
    const txId = '0x62be9bf4155af9ec473a1fdb8ab4b91d42bd040f346576cd25d3d7b284a9a146'

    const expectedTransfer: (TransactionTransferAsset | TransactionTransferNft)[] = [
      {
        amount: '0.001089',
        contractHash: '-',
        from: '0x7C08Bdb8413b5Ac3d97773c5a5ada76406D31d65',
        to: '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D',
        type: 'token',
      },
      {
        contractHash: '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D',
        from: '0x0000000000000000000000000000000000000000',
        to: '0x7C08Bdb8413b5Ac3d97773c5a5ada76406D31d65',
        tokenId: '562',
        type: 'nft',
      },
    ]

    const expectedResponse: TransactionResponse = {
      block: 837660,
      hash: txId,
      notifications: [],
      time: 1721949394000 / 1000,
      transfers: expectedTransfer,
      fee: '0.314152412',
    }

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const transaction = await blockscoutBDSNeoX.getTransaction(txId)

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return transactions by address without next page', async () => {
    const address = '0xdc0b6d0F38738a89BA9193B50fF4111030f0d329'

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
      nextPageParams: null,
    }

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const transaction = await blockscoutBDSNeoX.getTransactionsByAddress({ address })

    expect(transaction).toEqual(expectedResponse)
  })

  it('Should return token info', async () => {
    const tokenHash = '0x7de8952AeADA3fF7dA1377A5E14a29603f33d829'

    const expectedToken = {
      decimals: 18,
      hash: tokenHash,
      name: 'USDT',
      symbol: 'USDT',
    }

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const token = await blockscoutBDSNeoX.getTokenInfo(tokenHash)

    expect(token).toEqual(expectedToken)
  })

  it('Should return balance', async () => {
    const address = '0xCD1114886fbe4AC877D545D7C16145871921fE33'

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
      {
        amount: expect.any(String),
        token: {
          decimals: 10,
          hash: '0x42aF6A3533173eb1BC6A05d5ab3A5184612A038c',
          name: 'IOTC',
          symbol: 'IOTC',
        },
      },
    ]

    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const balance = await blockscoutBDSNeoX.getBalance(address)

    expect(balance).toEqual(expectedBalance)
  })

  it('Should return block height', async () => {
    const blockscoutBDSNeoX = new BlockscoutNeoXBDSEthereum(network)
    const blockHeight = await blockscoutBDSNeoX.getBlockHeight()

    expect(blockHeight).toBeGreaterThan(0)
  })
})
