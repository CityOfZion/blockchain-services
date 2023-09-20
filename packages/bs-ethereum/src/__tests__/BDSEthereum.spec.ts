import { BDSClaimable, BlockchainDataService } from '@cityofzion/blockchain-service'
import { BitqueryBDSEthereum } from '../BitqueryBDSEthereum'
import { RpcBDSEthereum } from '../RpcBDSEthereum'
import { DEFAULT_URL_BY_NETWORK_TYPE } from '../constants'

const bitqueryBDSEthereum = new BitqueryBDSEthereum({ type: 'testnet', url: DEFAULT_URL_BY_NETWORK_TYPE.testnet })
const rpcBDSEthereum = new RpcBDSEthereum({ type: 'testnet', url: DEFAULT_URL_BY_NETWORK_TYPE.testnet })

describe('BDSEthereum', () => {
  it.each([rpcBDSEthereum, bitqueryBDSEthereum])(
    'Should be able to get transaction - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const hash = '0x43fa3015d077a13888409cfbd6228df8900abcd5314ff11ea6ce0c49e8b7c94d'
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
            amount: expect.any(String),
            type: expect.any(String),
          })
        )
      })
    },
    10000
  )

  it.each([bitqueryBDSEthereum])(
    'Should be able to get transactions of address - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
      const response = await BDSEthereum.getTransactionsByAddress({ address: address, page: 1 })
      expect(response.totalCount).toBeGreaterThan(0)
      response.transactions.forEach(transaction => {
        expect(transaction).toEqual(
          expect.objectContaining({
            block: expect.any(Number),
            hash: expect.any(String),
            notifications: [],
            time: expect.any(Number),
            fee: expect.any(String),
          })
        )

        transaction.transfers.forEach(transfer => {
          expect(transfer).toEqual(
            expect.objectContaining({
              from: expect.any(String),
              to: expect.any(String),
              contractHash: expect.any(String),
              amount: expect.any(String),
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
      const hash = '0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc'
      const token = await BDSEthereum.getTokenInfo(hash)

      expect(token).toEqual({
        hash: '0xba62bcfcaafc6622853cca2be6ac7d845bc0f2dc',
        name: 'FaucetToken',
        symbol: 'FAU',
        decimals: 18,
      })
    }
  )

  it.each([bitqueryBDSEthereum, rpcBDSEthereum])(
    'Should be able to get balance - %s',
    async (BDSEthereum: BlockchainDataService) => {
      const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
      const balance = await BDSEthereum.getBalance(address)

      balance.forEach(balance => {
        expect(balance).toEqual(
          expect.objectContaining({
            amount: expect.any(String),
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
