import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BSNeoX } from '../BSNeoX'
import type {
  TGetFullTransactionsByAddressParams,
  TTransaction,
  TTransactionBridgeNeo3NeoX,
  TTransactionNftEvent,
} from '@cityofzion/blockchain-service'
import { BlockscoutFullTransactionsDataService } from '../services/full-transactions-data/BlockscoutFullTransactionsDataService'

const address = '0x889D02c0df966Ea5BE11dd8E3Eb0d5E4BD0500dD'

let dateFrom: Date
let dateTo: Date
let params: TGetFullTransactionsByAddressParams

let blockscoutFullTransactionsDataService: BlockscoutFullTransactionsDataService<'test'>
let service: BSNeoX<'test'>

vi.mock('../services/nft-data/GhostMarketNDSNeoX', () => {
  const GhostMarketNDSNeoX = vi.fn()

  GhostMarketNDSNeoX.prototype.getNft = vi.fn().mockResolvedValue({
    image: 'nftImage',
    name: 'nftName',
    explorerUri: 'nftUrl',
    collection: { name: 'nftCollectionName', hash: 'nftCollectionHash', url: 'nftCollectionUrl' },
  })

  return {
    GhostMarketNDSNeoX,
  }
})

describe('BlockscoutFullTransactionsDataService', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)
    dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    service = new BSNeoX('test')
    blockscoutFullTransactionsDataService = new BlockscoutFullTransactionsDataService(service)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, dateFrom: '' })
      ).rejects.toThrow('Missing dateFrom param')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, dateTo: '' })
      ).rejects.toThrow('Missing dateTo param')
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })
      ).rejects.toThrow('Invalid dateFrom param')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })
      ).rejects.toThrow('Invalid dateTo param')
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, address: 'invalid' })
      ).rejects.toThrow('Invalid address param')
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, pageSize: 0 })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, pageSize: 501 })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        blockscoutFullTransactionsDataService.getFullTransactionsByAddress({ ...params, pageSize: NaN })
      ).rejects.toThrow('Page size should be between 1 and 500')
    })

    it('Should be able to get transactions when is using a Neo X Testnet network', async () => {
      service = new BSNeoX('test', BSNeoXConstants.TESTNET_NETWORK)
      blockscoutFullTransactionsDataService = new BlockscoutFullTransactionsDataService(service)

      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response).toEqual({
        nextPageParams: expect.anything(),
        transactions: expect.arrayContaining([
          expect.objectContaining({
            txId: expect.any(String),
            txIdUrl: expect.any(String),
            block: expect.any(Number),
            date: expect.any(String),
            invocationCount: expect.any(Number),
            notificationCount: expect.any(Number),
            networkFeeAmount: expect.anything(),
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
                tokenType: expect.any(String),
              }),
            ]),
          }),
        ]),
      })
    })

    it('Should be able to get transactions when is using a Neo X Mainnet network', async () => {
      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response).toEqual({
        nextPageParams: expect.anything(),
        transactions: expect.arrayContaining([
          expect.objectContaining({
            txId: expect.any(String),
            txIdUrl: expect.any(String),
            block: expect.any(Number),
            date: expect.any(String),
            invocationCount: expect.any(Number),
            notificationCount: expect.any(Number),
            networkFeeAmount: expect.anything(),
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
                tokenType: 'generic',
              }),
            ]),
          }),
        ]),
      })
    })

    it('Should be able to get transactions when send the nextPageParams param using Neo X Mainnet network', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-04-26T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x1212000000000000000000000000000000000004',
      }

      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress(newParams)
      const nextResponse = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    // The NFTs on Neo X should be implemented in future in Dora (remove mock to test)
    it.skip('Should be able to get transactions with NFTs when it was called using Neo X Mainnet network', async () => {
      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress({
        ...params,
        address: '0xE3aBC0b2A74FD2eF662b1c25C9769398f53b4304',
        dateFrom: new Date('2024-01-01T12:00:00').toJSON(),
        dateTo: new Date('2024-12-31T12:00:00').toJSON(),
      })

      const nftEvents = response.transactions
        .flatMap(({ events }) => events)
        .filter(({ eventType }) => eventType === 'nft') as TTransactionNftEvent[]

      expect(nftEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'nft',
            amount: undefined,
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            tokenId: expect.any(String),
            tokenType: 'generic',
            nftImageUrl: 'nftImage',
            nftUrl: expect.any(String),
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    })

    it('Should be able to get transactions with default pageSize param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x1212000000000000000000000000000000000004',
      }

      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress(newParams)

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBe(50)
    })

    it('Should be able to get transactions that are marked as bridge (GAS)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-18T10:00:00').toJSON(),
        dateTo: new Date('2025-08-18T22:00:00').toJSON(),
        address: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
      }

      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress(newParams)

      const transaction = response.transactions.find(
        ({ txId }) => txId === '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
      ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.gasToken)
      expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
    })

    it('Should be able to get transactions that are marked as bridge (NEO)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-06-03T10:00:00').toJSON(),
        dateTo: new Date('2025-06-05T10:00:00').toJSON(),
        address: '0x5c2b22ecc2660187bee0a4b737e4d93283270dea',
      }

      const response = await blockscoutFullTransactionsDataService.getFullTransactionsByAddress(newParams)

      const transaction = response.transactions.find(
        ({ txId }) => txId === '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
      ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.neoToken)
      expect(transaction.data.receiverAddress).toBe('NLxVU1mCenEsCXgzDJcY7YF145ErGjx1W8')
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Neo X Testnet network', async () => {
      service = new BSNeoX('test', BSNeoXConstants.TESTNET_NETWORK)
      blockscoutFullTransactionsDataService = new BlockscoutFullTransactionsDataService(service)

      const response = await blockscoutFullTransactionsDataService.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Neo X Mainnet network', async () => {
      const response = await blockscoutFullTransactionsDataService.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
