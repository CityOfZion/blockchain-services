import { BSEthereumConstants, BSEthereumNetworkId } from '../constants/BSEthereumConstants'
import { MoralisBDSEthereum } from '../services/blockchain-data/MoralisBDSEthereum'
import {
  BSUtilsHelper,
  ExplorerService,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  Network,
  NftDataService,
} from '@cityofzion/blockchain-service'
import { GhostMarketNDSEthereum } from '../services/nft-data/GhostMarketNDSEthereum'
import { isLeapYear } from 'date-fns'
import { BlockscoutESEthereum } from '../services/explorer/BlockscoutESEthereum'

describe('MoralisBDSEthereumFullTransactionsByAddress', () => {
  const address = '0xe688b84b23f322a994A53dbF8E15FA82CDB71127'
  const polygonAddress = '0x019d0706d65c4768ec8081ed7ce41f59eef9b86c'
  const baseAddress = '0x36d7a1ef48bb241f1e31ec5c4b9bf78e553f422a'
  const arbitrumAddress = '0x009905bf008CcA637185EEaFE8F51BB56dD2ACa7'

  const network = BSEthereumConstants.DEFAULT_NETWORK

  const polygonNetwork: Network<BSEthereumNetworkId> = {
    id: BSEthereumConstants.POLYGON_MAINNET_NETWORK_ID,
    name: 'Polygon',
    url: 'https://polygon.meowrpc.com',
  }

  const baseNetwork: Network<BSEthereumNetworkId> = {
    id: BSEthereumConstants.BASE_MAINNET_NETWORK_ID,
    name: 'Base',
    url: 'https://base.llamarpc.com',
  }

  const arbitrumNetwork: Network<BSEthereumNetworkId> = {
    id: BSEthereumConstants.ARBITRUM_MAINNET_NETWORK_ID,
    name: 'Arbitrum',
    url: 'https://arbitrum.llamarpc.com',
  }

  const invalidNetwork: Network = {
    id: 'invalid-network',
    name: 'Invalid network',
    url: 'https://invalid-network.com',
  }

  let dateFrom: Date
  let dateTo: Date
  let params: FullTransactionsByAddressParams
  let nftDataService: NftDataService
  let explorerService: ExplorerService
  let moralisBDSEthereum: MoralisBDSEthereum

  const expectedResponse = {
    nextCursor: expect.anything(),
    data: expect.arrayContaining([
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.anything(),
        block: expect.any(Number),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        notificationCount: expect.any(Number),
        networkFeeAmount: expect.anything(),
        events: expect.arrayContaining([
          expect.objectContaining({
            eventType: expect.any(String),
            amount: expect.anything(),
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            hash: expect.any(String),
            tokenType: expect.any(String),
          }),
        ]),
      }),
    ]),
  }

  const initMoralisBDSEthereum = (network: Network) => {
    nftDataService = new GhostMarketNDSEthereum(network) as jest.Mocked<GhostMarketNDSEthereum>

    nftDataService.getNft = jest
      .fn()
      .mockReturnValue({ image: 'nftImage', name: 'nftName', collectionName: 'nftCollectionName' })

    explorerService = new BlockscoutESEthereum(network) as jest.Mocked<BlockscoutESEthereum>

    explorerService.getAddressTemplateUrl = jest.fn().mockReturnValue('addressTemplateUrl')
    explorerService.getTxTemplateUrl = jest.fn().mockReturnValue('txTemplateUrl')
    explorerService.getNftTemplateUrl = jest.fn().mockReturnValue('nftTemplateUrl')
    explorerService.getContractTemplateUrl = jest.fn().mockReturnValue('contractTemplateUrl')

    moralisBDSEthereum = new MoralisBDSEthereum(network, nftDataService, explorerService)
  }

  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    initMoralisBDSEthereum(network)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (invalid) from Ethereum Mainnet and EVMs Mainnet", async () => {
      initMoralisBDSEthereum(invalidNetwork)

      await expect(moralisBDSEthereum.getFullTransactionsByAddress(params)).rejects.toThrow(
        'This network is not supported'
      )
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, dateFrom: '' })).rejects.toThrow(
        'Missing dateFrom param'
      )

      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, dateTo: '' })).rejects.toThrow(
        'Missing dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })).rejects.toThrow(
        'Invalid dateFrom param'
      )

      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })).rejects.toThrow(
        'Invalid dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        moralisBDSEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, address: 'invalid' })).rejects.toThrow(
        'Invalid address param'
      )
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        moralisBDSEthereum.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        moralisBDSEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        moralisBDSEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: new Date().toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        moralisBDSEthereum.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: dateTo.toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, pageSize: 0 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, pageSize: 501 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(moralisBDSEthereum.getFullTransactionsByAddress({ ...params, pageSize: NaN })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )
    })

    it('Should be able to get transactions when is using a Ethereum Mainnet network', async () => {
      const response = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response).toEqual(expectedResponse)
    }, 30000)

    it('Should be able to get transactions when is using a Polygon Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(polygonNetwork)

      const response = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response).toEqual(expectedResponse)
    }, 30000)

    it('Should be able to get transactions when is using a Base Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(baseNetwork)

      const response = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      })

      expect(response).toEqual(expectedResponse)
    }, 30000)

    it('Should be able to get transactions when is using a Arbitrum Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(arbitrumNetwork)

      const response = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-10-25T12:00:00').toJSON(),
        dateTo: new Date('2024-11-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      })

      expect(response).toEqual(expectedResponse)
    }, 30000)

    it('Should be able to get transactions when send the nextCursor param using Ethereum Mainnet network', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-25T11:45:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
      }

      const response = await moralisBDSEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    it('Should be able to get transactions when send the nextCursor param using Polygon Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(polygonNetwork)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-25T11:50:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      }

      const response = await moralisBDSEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    it('Should be able to get transactions when send the nextCursor param using Base Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(baseNetwork)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      }

      const response = await moralisBDSEthereum.getFullTransactionsByAddress(newParams)
      const nextResponse = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    it('Should be able to get transactions when send the nextCursor param using Arbitrum Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(arbitrumNetwork)

      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-25T10:30:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      }

      const response = await moralisBDSEthereum.getFullTransactionsByAddress(newParams)

      await BSUtilsHelper.wait(1000) // It's necessary to have this timeout because of an issue on endpoint

      const nextResponse = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    // When NFTs from Ethereum were supported, uncomment this test
    // it('Should be able to get transactions with NFTs when it was called using Ethereum Mainnet network', async () => {
    //   const response = await moralisBDSEthereum.getFullTransactionsByAddress({
    //     ...params,
    //     address: '0x604eb5d4126e3318ec27721bd5059307684f5c89',
    //     dateFrom: new Date('2024-01-01T12:00:00').toJSON(),
    //     dateTo: new Date('2024-12-31T12:00:00').toJSON(),
    //   })
    //
    //   const nftEvents = response.data
    //     .flatMap(({ events }) => events)
    //     .filter(({ eventType }) => eventType === 'nft') as FullTransactionNftEvent[]
    //
    //   expect(nftEvents).toEqual(
    //     expect.arrayContaining([
    //       expect.objectContaining({
    //         eventType: 'nft',
    //         amount: undefined,
    //         methodName: expect.any(String),
    //         from: expect.anything(),
    //         fromUrl: expect.anything(),
    //         to: expect.anything(),
    //         toUrl: expect.anything(),
    //         hash: expect.any(String),
    //         hashUrl: expect.any(String),
    //         tokenId: expect.any(String),
    //         tokenType: expect.any(String),
    //         nftImageUrl: 'nftImage',
    //         nftUrl: expect.any(String),
    //         name: 'nftName',
    //         collectionName: 'nftCollectionName',
    //       }),
    //     ])
    //   )
    // }, 30000)

    it('Should be able to get transactions with NFTs when it was called using Polygon Mainnet network', async () => {
      initMoralisBDSEthereum(polygonNetwork)

      const response = await moralisBDSEthereum.getFullTransactionsByAddress({
        ...params,
        address: '0x3c8287c41ad4938f4041cdc869b78bce8680d260',
        dateFrom: new Date('2024-03-30T12:00:00').toJSON(),
        dateTo: new Date('2025-02-30T12:00:00').toJSON(),
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
            hash: expect.any(String),
            hashUrl: expect.any(String),
            tokenId: expect.any(String),
            tokenType: expect.any(String),
            nftImageUrl: 'nftImage',
            nftUrl: expect.any(String),
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    }, 30000)

    it('Should be able to get transactions with default pageSize param using Ethereum Mainnet network', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-25T11:45:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
      }

      const response = await moralisBDSEthereum.getFullTransactionsByAddress(newParams)

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
    }, 60000)
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Ethereum Mainnet network', async () => {
      const response = await moralisBDSEthereum.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('Should be able to export transactions when is using a Polygon Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(polygonNetwork)

      const response = await moralisBDSEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2025-02-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: polygonAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('Should be able to export transactions when is using a Base Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(baseNetwork)

      const response = await moralisBDSEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2024-05-25T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
        address: baseAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('Should be able to export transactions when is using a Arbitrum Mainnet network (EVM)', async () => {
      initMoralisBDSEthereum(arbitrumNetwork)

      const response = await moralisBDSEthereum.exportFullTransactionsByAddress({
        dateFrom: new Date('2024-10-25T12:00:00').toJSON(),
        dateTo: new Date('2024-11-25T12:00:00').toJSON(),
        address: arbitrumAddress,
      })

      expect(response.length).toBeGreaterThan(0)
    }, 30000)
  })
})
