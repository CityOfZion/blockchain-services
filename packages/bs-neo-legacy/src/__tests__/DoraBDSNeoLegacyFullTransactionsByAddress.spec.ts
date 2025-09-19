import { TFullTransactionsByAddressParams } from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'
import { isLeapYear } from 'date-fns'
import { BSNeoLegacy } from '../BSNeoLegacy'

jest.mock('../services/explorer/NeoTubeESNeoLegacy', () => {
  return {
    NeoTubeESNeoLegacy: jest.fn().mockImplementation(() => {
      return {
        getAddressTemplateUrl: jest.fn().mockReturnValue('addressTemplateUrl'),
        getTxTemplateUrl: jest.fn().mockReturnValue('txTemplateUrl'),
        getNftTemplateUrl: jest.fn().mockReturnValue('nftTemplateUrl'),
        getContractTemplateUrl: jest.fn().mockReturnValue('contractTemplateUrl'),
      }
    }),
  }
})

const address = 'AFnH8Cv7qzuxWZdeLqK9QqTrfPWCq5f8A3'
let dateFrom: Date
let dateTo: Date
let params: TFullTransactionsByAddressParams
let bdsNeoLegacy: DoraBDSNeoLegacy<'test'>

describe('DoraBDSNeoLegacy - fullTransactionsByAddress', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    const service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    bdsNeoLegacy = new DoraBDSNeoLegacy(service)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a testnet network", async () => {
      bdsNeoLegacy = new DoraBDSNeoLegacy(new BSNeoLegacy('test', BSNeoLegacyConstants.TESTNET_NETWORK))

      await expect(bdsNeoLegacy.getFullTransactionsByAddress(params)).rejects.toThrow('Network not supported')
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, dateFrom: '' })).rejects.toThrow(
        'Missing dateFrom param'
      )

      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, dateTo: '' })).rejects.toThrow(
        'Missing dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })).rejects.toThrow(
        'Invalid dateFrom param'
      )

      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })).rejects.toThrow(
        'Invalid dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        bdsNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, address: 'invalid' })).rejects.toThrow(
        'Invalid address param'
      )
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        bdsNeoLegacy.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        bdsNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        bdsNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        bdsNeoLegacy.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, pageSize: 0 })).rejects.toThrow(
        'Page size should be between 1 and 30'
      )

      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, pageSize: 31 })).rejects.toThrow(
        'Page size should be between 1 and 30'
      )

      await expect(bdsNeoLegacy.getFullTransactionsByAddress({ ...params, pageSize: NaN })).rejects.toThrow(
        'Page size should be between 1 and 30'
      )
    })

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      const response = await bdsNeoLegacy.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-04-24T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response).toEqual({
        nextCursor: expect.anything(),
        data: expect.arrayContaining([
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

    it('Should be able to get transactions when send the nextCursor param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-20T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      }

      const response = await bdsNeoLegacy.getFullTransactionsByAddress(newParams)

      const nextResponse = await bdsNeoLegacy.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    })

    it('Should be able to get transactions with default pageSize param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-20T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      }

      const response = await bdsNeoLegacy.getFullTransactionsByAddress(newParams)

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBe(30)
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Mainnet network', async () => {
      const response = await bdsNeoLegacy.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2025-04-24T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
