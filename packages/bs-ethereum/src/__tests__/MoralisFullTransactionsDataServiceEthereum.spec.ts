import {
  BSUtilsHelper,
  TBSNetworkId,
  type TGetFullTransactionsByAddressParams,
  type TTransactionNftEvent,
} from '@cityofzion/blockchain-service'
import { isLeapYear } from 'date-fns'
import { BSEthereum } from '../BSEthereum'
import { MoralisFullTransactionsDataServiceEthereum } from '../services/full-transactions-data/MoralisFullTransactionsDataServiceEthereum'

const address = '0xd1d6634415be11a54664298373c57c131aa828d5'
const polygonAddress = '0xbCc845dcfF7005c0ca7BD11eA8b5049a384a9f94'
const baseAddress = '0x4088e9E4d61B8F575aB7518fe46D741980017daA'
const arbitrumAddress = '0x0b07f64ABc342B68AEc57c0936E4B6fD4452967E'

const expectedResponse = {
  nextPageParams: expect.anything(),
  data: expect.arrayContaining([
    expect.objectContaining({
      txId: expect.any(String),
      txIdUrl: expect.anything(),
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
}

let dateFrom: Date
let dateTo: Date
let params: TGetFullTransactionsByAddressParams
let moralisFullTransactionsDataServiceEthereum: MoralisFullTransactionsDataServiceEthereum<'test', TBSNetworkId>

jest.mock('../services/nft-data/GhostMarketNDSEthereum', () => {
  return {
    GhostMarketNDSEthereum: jest.fn().mockImplementation(() => {
      return {
        getNft: jest.fn().mockReturnValue({
          image: 'nftImage',
          name: 'nftName',
          collection: { name: 'nftCollectionName', hash: 'nftCollectionHash' },
        }),
      }
    }),
  }
})

jest.mock('../services/explorer/BlockscoutESEthereum', () => {
  return {
    BlockscoutESEthereum: jest.fn().mockImplementation(() => {
      return {
        getAddressTemplateUrl: jest.fn().mockReturnValue('addressTemplateUrl'),
        getTxTemplateUrl: jest.fn().mockReturnValue('txTemplateUrl'),
        getNftTemplateUrl: jest.fn().mockReturnValue('nftTemplateUrl'),
        getContractTemplateUrl: jest.fn().mockReturnValue('contractTemplateUrl'),
      }
    }),
  }
})

describe.skip('MoralisFullTransactionsDataServiceEthereum', () => {
  beforeEach(async () => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    const service = new BSEthereum('test', 'ethereum')
    moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

    await BSUtilsHelper.wait(3000)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({ ...params, dateFrom: '' })
      ).rejects.toThrow('Missing dateFrom param')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({ ...params, dateTo: '' })
      ).rejects.toThrow('Missing dateTo param')
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })
      ).rejects.toThrow('Invalid dateFrom param')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })
      ).rejects.toThrow('Invalid dateTo param')
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
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
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          pageSize: 0,
          dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
          dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          pageSize: 501,
          dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
          dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        })
      ).rejects.toThrow('Page size should be between 1 and 500')

      await expect(
        moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
          ...params,
          pageSize: NaN,
          dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
          dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        })
      ).rejects.toThrow('Page size should be between 1 and 500')
    })

    it('Should be able to get transactions when is using a Ethereum Mainnet network', async () => {
      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response).toEqual(expectedResponse)
    })

    it('Should be able to get transactions when is using a Polygon Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-04-26T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response).toEqual(expectedResponse)
    })

    it('Should be able to get transactions when is using a Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'base')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      })

      expect(response).toEqual(expectedResponse)
    })

    it('Should be able to get transactions when is using a Arbitrum Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'arbitrum')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      })

      expect(response).toEqual(expectedResponse)
    })

    it('Should be able to get transactions when send the nextPageParams param using Ethereum Mainnet network', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-06-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      }

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Polygon Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      }

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'base')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      }

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Arbitrum Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'arbitrum')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const newParams = {
        ...params,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      }

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress(newParams)

      await BSUtilsHelper.wait(1000) // It's necessary to have this timeout because of an issue on endpoint

      const nextResponse = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    })

    it('Should be able to get transactions with NFTs when it was called using Polygon Mainnet network', async () => {
      const service = new BSEthereum('test', 'polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        address: '0x3c8287c41ad4938f4041cdc869b78bce8680d260',
        dateFrom: new Date('2024-03-30T12:00:00').toJSON(),
        dateTo: new Date('2025-02-30T12:00:00').toJSON(),
      })

      const nftEvents = response.data
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
            collectionHashUrl: expect.any(String),
            tokenHash: expect.any(String),
            tokenType: expect.any(String),
            nftImageUrl: 'nftImage',
            nftUrl: expect.any(String),
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Ethereum Mainnet network', async () => {
      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Polygon Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'base')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Arbitrum Mainnet network (EVM)', async () => {
      const service = new BSEthereum('test', 'arbitrum')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2024-10-25T12:00:00').toJSON(),
        dateTo: new Date('2024-11-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
