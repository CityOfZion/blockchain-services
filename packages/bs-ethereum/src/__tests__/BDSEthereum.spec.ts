import { BDSClaimable, BlockchainDataService } from '@cityofzion/blockchain-service'
import { BitqueryBDSEthereum } from '../BitqueryBDSEthereum'
import { RpcBDSEthereum } from '../RpcBDSEthereum'
import { DEFAULT_URL_BY_NETWORK_TYPE } from '../constants'

let bitqueryBDSEthereum = new BitqueryBDSEthereum('testnet')
let rpcBDSEthereum = new RpcBDSEthereum({ type: 'testnet', url: DEFAULT_URL_BY_NETWORK_TYPE.testnet })

describe.only('BDSEthereum', () => {
  it.each([rpcBDSEthereum, bitqueryBDSEthereum])(
    'Should be able to get transaction - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const hash = '0xf375bdb7cd119b65b9808655c7786ca47d5761c98aeaa7d63cbad63d6fd99f24'
      const transaction = await BDSEthereum.getTransaction(hash)

      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash,
          notifications: [],
          time: expect.any(Number),
        })
      )
      transaction.transfers.forEach(transfer => {
        expect(transfer).toEqual(
          expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
            contractHash: expect.any(String),
            amount: expect.any(Number),
            type: expect.any(String),
          })
        )
      })
    }
  )

  it.only.each([bitqueryBDSEthereum])(
    'Should be able to get transactions of address - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const address = '0xFACf5446B71dB33E920aB1769d9427146183aEcd'
      const response = await BDSEthereum.getTransactionsByAddress(address, 1)
      response.transactions.forEach(transaction => {
        expect(transaction).toEqual(
          expect.objectContaining({
            block: expect.any(Number),
            hash: expect.any(String),
            notifications: [],
            time: expect.any(Number),
            fee: expect.any(Number),
          })
        )

        transaction.transfers.forEach(transfer => {
          expect(transfer).toEqual(
            expect.objectContaining({
              from: expect.any(String),
              to: expect.any(String),
              contractHash: expect.any(String),
              amount: expect.any(Number),
              type: expect.any(String),
            })
          )
        })
      })
    },
    10000
  )

  it.each([bitqueryBDSEthereum, rpcBDSEthereum])(
    'Should be able to get eth info - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const hash = '-'
      const token = await BDSEthereum.getTokenInfo(hash)

      expect(token).toEqual({
        symbol: 'ETH',
        name: 'Ethereum',
        hash: '-',
        decimals: 16,
      })
    }
  )

  it.each([bitqueryBDSEthereum])(
    'Should be able to get token info - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const hash = '0x9813037ee2218799597d83d4a5b6f3b6778218d9'
      const token = await BDSEthereum.getTokenInfo(hash)

      expect(token).toEqual({
        symbol: 'BONE',
        name: 'BONE SHIBASWAP',
        hash: '0x9813037ee2218799597d83d4a5b6f3b6778218d9',
        decimals: 18,
      })
    }
  )

  it.only.each([bitqueryBDSEthereum])(
    'Should be able to get balance - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const address = '0xFACf5446B71dB33E920aB1769d9427146183aEcd'
      const balance = await BDSEthereum.getBalance(address)
      console.log(JSON.stringify(balance, null, 2))
      balance.forEach(balance => {
        expect(balance).toEqual(
          expect.objectContaining({
            amount: expect.any(Number),
            token: {
              hash: expect.any(String),
              name: expect.any(String),
              symbol: expect.any(String),
              decimals: expect.any(Number),
            },
          })
        )
      })
    }
  )
})
