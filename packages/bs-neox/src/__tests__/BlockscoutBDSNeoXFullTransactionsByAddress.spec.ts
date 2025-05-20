import {
  ExplorerService,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  Network,
  NftDataService,
} from '@cityofzion/blockchain-service'

import { isLeapYear } from 'date-fns'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BlockscoutBDSNeoX } from '../services/blockchain-data/BlockscoutBDSNeoX'

const otherNetwork: Network = { id: 'other-network', name: 'Other network', url: 'https://other-network.com' }
const address = '0x889D02c0df966Ea5BE11dd8E3Eb0d5E4BD0500dD'

let dateFrom: Date
let dateTo: Date
let params: FullTransactionsByAddressParams
let nftDataService: NftDataService
let explorerService: ExplorerService
let blockscoutBDSNeoX: BlockscoutBDSNeoX

describe('BlockscoutBDSNeoX - fullTransactionsByAddress', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    nftDataService = new GhostMarketNDSNeoX(BSNeoXConstants.MAINNET_NETWORK) as jest.Mocked<GhostMarketNDSNeoX>

    nftDataService.getNft = jest
      .fn()
      .mockReturnValue({ image: 'nftImage', name: 'nftName', collectionName: 'nftCollectionName' })

    explorerService = new BlockscoutESNeoX(BSNeoXConstants.MAINNET_NETWORK) as jest.Mocked<BlockscoutESNeoX>

    explorerService.getAddressTemplateUrl = jest.fn().mockReturnValue('addressTemplateUrl')
    explorerService.getTxTemplateUrl = jest.fn().mockReturnValue('txTemplateUrl')
    explorerService.getNftTemplateUrl = jest.fn().mockReturnValue('nftTemplateUrl')
    explorerService.getContractTemplateUrl = jest.fn().mockReturnValue('contractTemplateUrl')

    blockscoutBDSNeoX = new BlockscoutBDSNeoX(BSNeoXConstants.MAINNET_NETWORK, nftDataService, explorerService)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (Custom) from Neo X Mainnet and Neo X Testnet", async () => {
      nftDataService = new GhostMarketNDSNeoX(otherNetwork)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(otherNetwork, nftDataService, explorerService)

      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress(params)).rejects.toThrow(
        'This network is not supported'
      )
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, dateFrom: '' })).rejects.toThrow(
        'Missing dateFrom param'
      )

      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, dateTo: '' })).rejects.toThrow(
        'Missing dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })).rejects.toThrow(
        'Invalid dateFrom param'
      )

      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })).rejects.toThrow(
        'Invalid dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        blockscoutBDSNeoX.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, address: 'invalid' })).rejects.toThrow(
        'Invalid address param'
      )
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        blockscoutBDSNeoX.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        blockscoutBDSNeoX.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        blockscoutBDSNeoX.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it('Should be able to get transactions when is using a Neo X Testnet network', async () => {
      nftDataService = new GhostMarketNDSNeoX(BSNeoXConstants.TESTNET_NETWORK)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(BSNeoXConstants.TESTNET_NETWORK, nftDataService, explorerService)

      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
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
            networkFeeAmount: expect.any(String),
            systemFeeAmount: expect.any(String),
            events: expect.arrayContaining([
              expect.objectContaining({
                eventType: expect.any(String),
                amount: expect.any(String),
                methodName: expect.any(String),
                from: expect.anything(),
                fromUrl: expect.anything(),
                to: expect.anything(),
                toUrl: expect.anything(),
                hash: expect.any(String),
                tokenType: 'generic',
              }),
            ]),
          }),
        ]),
      })
    }, 30000)

    it('Should be able to get transactions when is using a Neo X Mainnet network', async () => {
      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
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
            networkFeeAmount: expect.any(String),
            systemFeeAmount: expect.any(String),
            events: expect.arrayContaining([
              expect.objectContaining({
                eventType: expect.any(String),
                amount: expect.any(String),
                methodName: expect.any(String),
                from: expect.anything(),
                fromUrl: expect.anything(),
                to: expect.anything(),
                toUrl: expect.anything(),
                hash: expect.any(String),
                tokenType: 'generic',
              }),
            ]),
          }),
        ]),
      })
    })

    // There isn't any Neo X address with cursor yet (you need to use the pageLimit for test it)
    it.skip('Should be able to get transactions when send the nextCursor param using Neo X Mainnet network', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-04-26T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x1212000000000000000000000000000000000004',
      }

      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress(newParams)
      const nextResponse = await blockscoutBDSNeoX.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.nextCursor).toBeFalsy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    // The NFTs on Neo X should be implemented in future in Dora (remove mock to test)
    it.skip('Should be able to get transactions with NFTs when it was called using Neo X Mainnet network', async () => {
      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress({
        ...params,
        address: '0xE3aBC0b2A74FD2eF662b1c25C9769398f53b4304',
        dateFrom: new Date('2024-01-01T12:00:00').toJSON(),
        dateTo: new Date('2024-12-31T12:00:00').toJSON(),
      })

      const nftEvents = response.data
        .flatMap(({ events }) => events)
        .filter(({ eventType }) => eventType === 'nft') as FullTransactionNftEvent[]

      expect(nftEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'nft',
            amount: expect.any(String),
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            hash: expect.any(String),
            hashUrl: expect.any(String),
            tokenId: expect.any(String),
            tokenType: 'generic',
            nftImageUrl: 'nftImage',
            nftUrl: expect.any(String),
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    }, 30000)
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Neo X Testnet network', async () => {
      nftDataService = new GhostMarketNDSNeoX(BSNeoXConstants.TESTNET_NETWORK)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(BSNeoXConstants.TESTNET_NETWORK, nftDataService, explorerService)

      const response = await blockscoutBDSNeoX.exportFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('Should be able to export transactions when is using a Neo X Mainnet network', async () => {
      const response = await blockscoutBDSNeoX.exportFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
