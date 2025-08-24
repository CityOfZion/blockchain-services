import {
  ExplorerService,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  FullTransactionsItem,
  FullTransactionsItemBridgeNeo3NeoX,
  Network,
  NftDataService,
} from '@cityofzion/blockchain-service'

import { isLeapYear } from 'date-fns'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BlockscoutBDSNeoX } from '../services/blockchain-data/BlockscoutBDSNeoX'
import { TokenServiceEthereum } from '@cityofzion/bs-ethereum'

const mainnetNetwork = BSNeoXConstants.DEFAULT_NETWORK
const testnetNetwork = BSNeoXConstants.TESTNET_NETWORKS[0]
const otherNetwork: Network = { id: 'other-network', name: 'Other network', url: 'https://other-network.com' }
const address = '0x889D02c0df966Ea5BE11dd8E3Eb0d5E4BD0500dD'

let dateFrom: Date
let dateTo: Date
let params: FullTransactionsByAddressParams
let nftDataService: NftDataService
let explorerService: ExplorerService
let blockscoutBDSNeoX: BlockscoutBDSNeoX
let tokenService: TokenServiceEthereum

describe('BlockscoutBDSNeoX - fullTransactionsByAddress', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    nftDataService = new GhostMarketNDSNeoX(mainnetNetwork) as jest.Mocked<GhostMarketNDSNeoX>

    nftDataService.getNft = jest.fn().mockReturnValue({
      image: 'nftImage',
      name: 'nftName',
      collection: { name: 'nftCollectionName', hash: 'nftCollectionHash' },
    })

    tokenService = new TokenServiceEthereum()

    explorerService = new BlockscoutESNeoX(mainnetNetwork, tokenService) as jest.Mocked<BlockscoutESNeoX>

    explorerService.getAddressTemplateUrl = jest.fn().mockReturnValue('addressTemplateUrl')
    explorerService.getTxTemplateUrl = jest.fn().mockReturnValue('txTemplateUrl')
    explorerService.getNftTemplateUrl = jest.fn().mockReturnValue('nftTemplateUrl')
    explorerService.getContractTemplateUrl = jest.fn().mockReturnValue('contractTemplateUrl')

    blockscoutBDSNeoX = new BlockscoutBDSNeoX(mainnetNetwork, nftDataService, explorerService, tokenService)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (Custom) from Neo X Mainnet and Neo X Testnet", async () => {
      nftDataService = new GhostMarketNDSNeoX(otherNetwork)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(otherNetwork, nftDataService, explorerService, tokenService)

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

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, pageSize: 0 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, pageSize: 501 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(blockscoutBDSNeoX.getFullTransactionsByAddress({ ...params, pageSize: NaN })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )
    })

    it('Should be able to get transactions when is using a Neo X Testnet network', async () => {
      nftDataService = new GhostMarketNDSNeoX(testnetNetwork)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(testnetNetwork, nftDataService, explorerService, tokenService)

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

    it('Should be able to get transactions when send the nextCursor param using Neo X Mainnet network', async () => {
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
    }, 30000)

    it('Should be able to get transactions with default pageSize param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x1212000000000000000000000000000000000004',
      }

      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress(newParams)

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBe(50)
    }, 60000)

    it('Should be able to get transactions that are marked as bridge (GAS)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-18T10:00:00').toJSON(),
        dateTo: new Date('2025-08-18T22:00:00').toJSON(),
        address: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
      }

      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress(newParams)

      const transaction = response.data.find(
        ({ txId }) => txId === '0x56dc44ef1dee628b6f9264b2fe71364f1ba1cfe397c76400c3563a6e50d3eac1'
      ) as FullTransactionsItem & FullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.data.amount).toBe('1.1')
      expect(transaction.data.token).toEqual(BSNeoXConstants.NATIVE_ASSET)
      expect(transaction.data.receiverAddress).toBe('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')
    }, 60000)

    it('Should be able to get transactions that are marked as bridge (NEO)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-06-03T10:00:00').toJSON(),
        dateTo: new Date('2025-06-05T10:00:00').toJSON(),
        address: '0x5c2b22ecc2660187bee0a4b737e4d93283270dea',
      }

      const response = await blockscoutBDSNeoX.getFullTransactionsByAddress(newParams)

      const transaction = response.data.find(
        ({ txId }) => txId === '0xbdaca7bb4773fc2595aa1135a76cedd9782aa0d043b283ffa328ea9cdaf32e4b'
      ) as FullTransactionsItem & FullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.token).toEqual(BSNeoXConstants.NEO_TOKEN)
      expect(transaction.data.receiverAddress).toBe('NLxVU1mCenEsCXgzDJcY7YF145ErGjx1W8')
    }, 60000)
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Neo X Testnet network', async () => {
      nftDataService = new GhostMarketNDSNeoX(testnetNetwork)
      blockscoutBDSNeoX = new BlockscoutBDSNeoX(testnetNetwork, nftDataService, explorerService, tokenService)

      const response = await blockscoutBDSNeoX.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('Should be able to export transactions when is using a Neo X Mainnet network', async () => {
      const response = await blockscoutBDSNeoX.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
