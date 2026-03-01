import {
  TBSNetwork,
  type TGetFullTransactionsByAddressParams,
  type TTransaction,
  type TTransactionBridgeNeo3NeoX,
  type TTransactionNftEvent,
} from '@cityofzion/blockchain-service'
import { isLeapYear } from 'date-fns'
import { BSNeo3 } from '../../BSNeo3'
import { DoraFullTransactionsDataServiceNeo3 } from '../../services/full-transactions-data/DoraFullTransactionsDataServiceNeo3'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'

const invalidNetwork: TBSNetwork = {
  id: 'other-network',
  name: 'Other network',
  url: 'https://other-network.com',
  type: 'custom',
}

const address = 'NYnfAZTcVfSfNgk4RnP2DBNgosq2tUN3U2'

let dateFrom: Date
let dateTo: Date
let params: TGetFullTransactionsByAddressParams

let service: BSNeo3<'test'>
let doraFullTransactionsDataServiceNeo3: DoraFullTransactionsDataServiceNeo3<'test'>

vi.mock('../../services/nft-data/GhostMarketNDSNeo3', () => {
  const GhostMarketNDSNeo3 = vi.fn()

  GhostMarketNDSNeo3.prototype.getNft = vi.fn().mockResolvedValue({
    image: 'nftImage',
    name: 'nftName',
    explorerUri: 'nftUrl',
    collection: { name: 'nftCollectionName', hash: 'nftCollectionHash', url: 'nftCollectionUrl' },
  })

  return {
    GhostMarketNDSNeo3,
  }
})

describe('DoraFullTransactionsDataServiceNeo3', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    doraFullTransactionsDataServiceNeo3 = new DoraFullTransactionsDataServiceNeo3(service)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (Custom) from Mainnet and Testnet", async () => {
      service = new BSNeo3('test', invalidNetwork)
      doraFullTransactionsDataServiceNeo3 = new DoraFullTransactionsDataServiceNeo3(service)

      await expect(doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress(params)).rejects.toThrow(
        'Network not supported'
      )
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, dateFrom: '' })
      ).rejects.toThrow('Missing dateFrom param')

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, dateTo: '' })
      ).rejects.toThrow('Missing dateTo param')
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })
      ).rejects.toThrow('Invalid dateFrom param')
      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })
      ).rejects.toThrow('Invalid dateTo param')
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, address: 'invalid' })
      ).rejects.toThrow('Invalid address param')
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, pageSize: 0 })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, pageSize: 501 })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({ ...params, pageSize: NaN })
      ).rejects.toThrow('Page size should be between 1 and 500')
    })

    it('Should be able to get transactions when is using a Testnet network', async () => {
      service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
      doraFullTransactionsDataServiceNeo3 = new DoraFullTransactionsDataServiceNeo3(service)

      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-02-24T20:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'NPpopZhoNx5AompcETfMGMtULCPyH6j93H',
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
            systemFeeAmount: expect.anything(),
            type: expect.any(String),
            events: expect.arrayContaining([
              expect.objectContaining({
                eventType: expect.any(String),
                amount: expect.anything(),
                methodName: expect.any(String),
                tokenType: expect.any(String),
              }),
            ]),
          }),
        ]),
      })
    })

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
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
          }),
        ]),
      })
    })

    it('Should be able to get transactions when send the nextPageParams param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-04-22T03:00:00').toJSON(),
        dateTo: new Date('2025-03-22T03:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
      }

      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress(newParams)

      const nextResponse = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions with NFTs when it was called', async () => {
      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-04-22T03:00:00').toJSON(),
        dateTo: new Date('2025-03-22T03:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
        nextPageParams: 'NTcyNTEwOA==',
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
            collectionHash: expect.any(String),
            collectionHashUrl: 'nftCollectionUrl',
            tokenHash: expect.any(String),
            tokenType: 'nep-11',
            nftImageUrl: 'nftImage',
            nftUrl: 'nftUrl',
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    })

    it('Should be able to get transactions with default pageSize param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-08-20T12:00:00').toJSON(),
        dateTo: new Date('2025-05-20T12:00:00').toJSON(),
        address: 'NeM8SHQsDCX54A12xa3ZbvWb4a7xiwYtdJ',
      }

      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress(newParams)

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBe(50)
    })

    it('Should be able to get transactions that are marked as bridge (GAS)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-27T10:00:00').toJSON(),
        dateTo: new Date('2025-08-28T10:00:00').toJSON(),
        address: 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD',
      }

      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress(newParams)

      const transaction = response.transactions.find(
        ({ txId }) => txId === '0x69016c9f2a980b7e71da89e9f18cf46f5e89fe03aaf35d72f7ca5f6bf24b3b55'
      ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'NativeDeposit')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.gasToken)
      expect(transaction.data.receiverAddress).toBe('0xa911a7fa0901cfc3f1da55a05593823e32e2f1a9')
    })

    it('Should be able to get transactions that are marked as bridge (NEO)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-12T06:00:00').toJSON(),
        dateTo: new Date('2025-08-14T20:00:00').toJSON(),
        address: 'NcTRyXXr2viSowk913dMTvws6sDNbmt8tj',
      }

      const response = await doraFullTransactionsDataServiceNeo3.getFullTransactionsByAddress(newParams)

      const transaction = response.transactions.find(
        ({ txId }) => txId === '0x979b90734ca49ea989e3515de2028196e42762f96f3fa56db24d1c47521075dd'
      ) as TTransaction<'test'> & TTransactionBridgeNeo3NeoX<'test'>

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'TokenDeposit')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.tokenToUse).toEqual(service.neo3NeoXBridgeService.neoToken)
      expect(transaction.data.receiverAddress).toBe('0xe94bea1d8bb8bcc13cd6974e6941f4d1896d56da')
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Testnet network', async () => {
      service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
      doraFullTransactionsDataServiceNeo3 = new DoraFullTransactionsDataServiceNeo3(service)

      const response = await doraFullTransactionsDataServiceNeo3.exportFullTransactionsByAddress({
        dateFrom: new Date('2025-02-24T20:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'NPpopZhoNx5AompcETfMGMtULCPyH6j93H',
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Mainnet network', async () => {
      const response = await doraFullTransactionsDataServiceNeo3.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
