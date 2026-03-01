import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacy } from '../BSNeoLegacy'
import type { TGetFullTransactionsByAddressParams } from '@cityofzion/blockchain-service'
import { DoraFullTransactionsDataServiceNeoLegacy } from '../services/full-transactions-data/DoraFullTransactionsDataServiceNeoLegacy'

const address = 'AFnH8Cv7qzuxWZdeLqK9QqTrfPWCq5f8A3'
let dateFrom: Date
let dateTo: Date
let params: TGetFullTransactionsByAddressParams
let doraFullTransactionsDataServiceNeoLegacy: DoraFullTransactionsDataServiceNeoLegacy<'test'>

describe('DoraFullTransactionsDataServiceNeoLegacy', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)
    dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    const service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    doraFullTransactionsDataServiceNeoLegacy = new DoraFullTransactionsDataServiceNeoLegacy(service)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a testnet network", async () => {
      doraFullTransactionsDataServiceNeoLegacy = new DoraFullTransactionsDataServiceNeoLegacy(
        new BSNeoLegacy('test', BSNeoLegacyConstants.TESTNET_NETWORK)
      )

      await expect(doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress(params)).rejects.toThrow(
        'Network not supported'
      )
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, dateFrom: '' })
      ).rejects.toThrow('Missing dateFrom param')

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, dateTo: '' })
      ).rejects.toThrow('Missing dateTo param')
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })
      ).rejects.toThrow('Invalid dateFrom param')

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })
      ).rejects.toThrow('Invalid dateTo param')
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, address: 'invalid' })
      ).rejects.toThrow('Invalid address param')
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
        })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, pageSize: 0 })
      ).rejects.toThrow('Page size should be between 1 and 30')

      await expect(
        doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({ ...params, pageSize: NaN })
      ).rejects.toThrow('Page size should be between 1 and 30')
    })

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      const response = await doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-04-24T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
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
        dateFrom: new Date('2025-04-20T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      }

      const response = await doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress(newParams)

      const nextResponse = await doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions with default pageSize param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-20T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      }

      const response = await doraFullTransactionsDataServiceNeoLegacy.getFullTransactionsByAddress(newParams)

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBe(30)
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Mainnet network', async () => {
      const response = await doraFullTransactionsDataServiceNeoLegacy.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2025-04-24T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
