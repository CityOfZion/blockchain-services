import {
  BSUtilsHelper,
  type TBSNetworkId,
  type TGetFullTransactionsByAddressParams,
  type TTransactionDefaultNftEvent,
} from '@cityofzion/blockchain-service'
import { isLeapYear } from 'date-fns'
import { BSEthereum } from '../BSEthereum'
import { MoralisFullTransactionsDataServiceEthereum } from '../services/full-transactions-data/MoralisFullTransactionsDataServiceEthereum'
import type { TBSEthereumName, TBSEthereumNetworkId } from '../types'

const address = '0xd1d6634415be11a54664298373c57c131aa828d5'
const polygonAddress = '0x54ea1b43097a68c0435bbcb9f222dd300bc4d2f5'
const baseAddress = '0x4088e9E4d61B8F575aB7518fe46D741980017daA'
const arbitrumAddress = '0x0b07f64ABc342B68AEc57c0936E4B6fD4452967E'

const expectedResponse = {
  nextPageParams: expect.anything(),
  transactions: expect.arrayContaining([
    expect.objectContaining({
      txId: expect.any(String),
      txIdUrl: expect.anything(),
      block: expect.any(Number),
      date: expect.any(String),
      networkFeeAmount: expect.anything(),
      view: 'default',
      events: expect.arrayContaining([
        expect.objectContaining({
          eventType: expect.any(String),
          amount: expect.anything(),
          methodName: expect.any(String),
          from: expect.anything(),
          fromUrl: expect.anything(),
          to: expect.anything(),
          toUrl: expect.anything(),
        }),
      ]),
    }),
  ]),
}

let dateFrom: Date
let dateTo: Date
let params: TGetFullTransactionsByAddressParams
let moralisFullTransactionsDataServiceEthereum: MoralisFullTransactionsDataServiceEthereum<
  TBSEthereumName,
  TBSNetworkId
>

vi.mock('../services/nft-data/GhostMarketNDSEthereum', () => {
  const GhostMarketNDSEthereum = vi.fn()

  GhostMarketNDSEthereum.prototype.getNft = vi.fn().mockResolvedValue({
    name: 'nftName',
    image: 'nftImage',
    explorerUri: 'nftUrl',
    collection: { name: 'nftCollectionName', hash: 'nftCollectionHash', url: 'nftCollectionUrl' },
  })

  return { GhostMarketNDSEthereum }
})

describe('MoralisFullTransactionsDataServiceEthereum', () => {
  beforeEach(async () => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('ethereum')
    moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

    await BSUtilsHelper.wait(5000)
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
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2026-02-25T12:00:00').toJSON(),
        dateTo: new Date('2026-03-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response).toEqual(expectedResponse)
    })

    it('Should be able to get transactions when is using a Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('base')
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
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('arbitrum')
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
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Polygon Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-10-25T12:00:00').toJSON(),
        dateTo: new Date('2026-03-25T12:00:00').toJSON(),
        address: polygonAddress,
      }

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextPageParams: response.nextPageParams,
      })

      expect(response.nextPageParams).toBeTruthy()
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('base')
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
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions when send the nextPageParams param using Arbitrum Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('arbitrum')
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
      expect(response.transactions.length).toBeTruthy()
      expect(nextResponse.transactions.length).toBeTruthy()
    })

    it('Should be able to get transactions with NFTs when it was called using Polygon Mainnet network', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.getFullTransactionsByAddress({
        ...params,
        address: '0x3c8287c41ad4938f4041cdc869b78bce8680d260',
        dateFrom: new Date('2024-03-30T12:00:00').toJSON(),
        dateTo: new Date('2025-02-30T12:00:00').toJSON(),
      })

      const nftEvents = response.transactions
        .flatMap(({ events }) => events)
        .filter(({ eventType }) => eventType === 'nft') as TTransactionDefaultNftEvent[]

      expect(nftEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'nft',
            methodName: expect.any(String),
            amount: '1',
            from: expect.toBeOneOf([expect.any(String), undefined]),
            fromUrl: expect.toBeOneOf([expect.any(String), undefined]),
            to: expect.toBeOneOf([expect.any(String), undefined]),
            toUrl: expect.toBeOneOf([expect.any(String), undefined]),
            nft: expect.anything(),
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
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('polygon')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2026-02-25T12:00:00').toJSON(),
        dateTo: new Date('2026-03-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Base Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('base')
      moralisFullTransactionsDataServiceEthereum = new MoralisFullTransactionsDataServiceEthereum(service)

      const response = await moralisFullTransactionsDataServiceEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Arbitrum Mainnet network (EVM)', async () => {
      const service = new BSEthereum<TBSEthereumName, TBSEthereumNetworkId>('arbitrum')
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
