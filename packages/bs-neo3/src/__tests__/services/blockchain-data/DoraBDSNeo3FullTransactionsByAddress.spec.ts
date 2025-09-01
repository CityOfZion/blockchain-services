import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../../helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from '../../../services/blockchain-data/DoraBDSNeo3'
import {
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  FullTransactionsItem,
  FullTransactionsItemBridgeNeo3NeoX,
  Network,
} from '@cityofzion/blockchain-service'
import { GhostMarketNDSNeo3 } from '../../../services/nft-data/GhostMarketNDSNeo3'
import { isLeapYear } from 'date-fns'
import { DoraESNeo3 } from '../../../services/explorer/DoraESNeo3'

describe('DoraBDSNeo3FullTransactionsByAddress', () => {
  const network = BSNeo3Constants.MAINNET_NETWORKS[0]
  const tokens = BSNeo3Helper.getTokens(network)
  const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')!
  const address = 'NYnfAZTcVfSfNgk4RnP2DBNgosq2tUN3U2'

  let dateFrom: Date
  let dateTo: Date
  let params: FullTransactionsByAddressParams
  let doraBDSNeo3: DoraBDSNeo3

  const initDoraBDSNeo3 = (network: Network) => {
    const nftDataService = new GhostMarketNDSNeo3(network) as jest.Mocked<GhostMarketNDSNeo3>

    nftDataService.getNft = jest
      .fn()
      .mockReturnValue({ image: 'nftImage', name: 'nftName', collectionName: 'nftCollectionName' })

    const explorerService = new DoraESNeo3(network) as jest.Mocked<DoraESNeo3>

    explorerService.getAddressTemplateUrl = jest.fn().mockReturnValue('addressTemplateUrl')
    explorerService.getTxTemplateUrl = jest.fn().mockReturnValue('txTemplateUrl')
    explorerService.getNftTemplateUrl = jest.fn().mockReturnValue('nftTemplateUrl')
    explorerService.getContractTemplateUrl = jest.fn().mockReturnValue('contractTemplateUrl')

    doraBDSNeo3 = new DoraBDSNeo3(network, gasToken, gasToken, tokens, nftDataService, explorerService)
  }

  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    initDoraBDSNeo3(network)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (Custom) from Mainnet and Testnet", async () => {
      initDoraBDSNeo3({ id: 'other-network', name: 'Other network', url: 'https://other-network.com' })

      await expect(doraBDSNeo3.getFullTransactionsByAddress(params)).rejects.toThrow(
        'Only Mainnet and Testnet are supported'
      )
    })

    it("Shouldn't be able to get transactions when missing one of the dates", async () => {
      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: '' })).rejects.toThrow(
        'Missing dateFrom param'
      )

      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateTo: '' })).rejects.toThrow(
        'Missing dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when one of the dates is invalid", async () => {
      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: 'invalid' })).rejects.toThrow(
        'Invalid dateFrom param'
      )
      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateTo: 'invalid' })).rejects.toThrow(
        'Invalid dateTo param'
      )
    })

    it("Shouldn't be able to get transactions when dateFrom is greater than dateTo", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateTo.setDate(dateTo.getDate() - 1)

      await expect(
        doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON(), dateTo: dateTo.toJSON() })
      ).rejects.toThrow('Invalid date order because dateFrom is greater than dateTo')
    })

    it("Shouldn't be able to get full transactions when address is wrong", async () => {
      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, address: 'invalid' })).rejects.toThrow(
        'Invalid address param'
      )
    })

    it("Shouldn't be able to get transactions when the range dates are greater than one year", async () => {
      dateFrom.setDate(dateFrom.getDate() - 1)
      dateFrom.setSeconds(dateFrom.getSeconds() - 1)

      await expect(
        doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON() })
      ).rejects.toThrow('Date range greater than one year')
    })

    it("Shouldn't be able to get transactions when the range dates are in future", async () => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setDate(dateFrom.getDate() + 1)
      dateTo.setDate(dateTo.getDate() + 2)

      await expect(
        doraBDSNeo3.getFullTransactionsByAddress({
          ...params,
          dateFrom: dateFrom.toJSON(),
          dateTo: new Date().toJSON(),
        })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: new Date().toJSON(), dateTo: dateTo.toJSON() })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')

      await expect(
        doraBDSNeo3.getFullTransactionsByAddress({ ...params, dateFrom: dateFrom.toJSON(), dateTo: dateTo.toJSON() })
      ).rejects.toThrow('The dateFrom and/or dateTo are in future')
    })

    it("Shouldn't be able to get transactions when pageSize param was invalid", async () => {
      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, pageSize: 0 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, pageSize: 501 })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )

      await expect(doraBDSNeo3.getFullTransactionsByAddress({ ...params, pageSize: NaN })).rejects.toThrow(
        'Page size should be between 1 and 500'
      )
    })

    it('Should be able to get transactions when is using a Testnet network', async () => {
      initDoraBDSNeo3(BSNeo3Constants.TESTNET_NETWORKS[0])

      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-02-24T20:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'NPpopZhoNx5AompcETfMGMtULCPyH6j93H',
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
                hash: expect.any(String),
                hashUrl: expect.any(String),
                tokenType: expect.any(String),
              }),
            ]),
          }),
        ]),
      })
    }, 120000)

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      const response = await doraBDSNeo3.getFullTransactionsByAddress({
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
                hash: expect.any(String),
                hashUrl: expect.any(String),
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
    }, 120000)

    it('Should be able to get transactions when send the nextCursor param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2024-04-22T03:00:00').toJSON(),
        dateTo: new Date('2025-03-22T03:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)

      const nextResponse = await doraBDSNeo3.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 360000)

    it('Should be able to get transactions with NFTs when it was called', async () => {
      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-05-22T03:00:00').toJSON(),
        dateTo: new Date('2025-01-22T03:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
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
            tokenType: 'nep-11',
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
        dateFrom: new Date('2024-08-20T12:00:00').toJSON(),
        dateTo: new Date('2025-05-20T12:00:00').toJSON(),
        address: 'NeM8SHQsDCX54A12xa3ZbvWb4a7xiwYtdJ',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBe(50)
    }, 360000)

    it('Should be able to get transactions that are marked as bridge (GAS)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-27T10:00:00').toJSON(),
        dateTo: new Date('2025-08-28T10:00:00').toJSON(),
        address: 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)

      const transaction = response.data.find(
        ({ txId }) => txId === '0x69016c9f2a980b7e71da89e9f18cf46f5e89fe03aaf35d72f7ca5f6bf24b3b55'
      ) as FullTransactionsItem & FullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'depositNative')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.token).toEqual(BSNeo3Constants.GAS_TOKEN)
      expect(transaction.data.receiverAddress).toBe('0xa911a7fa0901cfc3f1da55a05593823e32e2f1a9')
    }, 60000)

    it('Should be able to get transactions that are marked as bridge (NEO)', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-08-12T06:00:00').toJSON(),
        dateTo: new Date('2025-08-14T20:00:00').toJSON(),
        address: 'NcTRyXXr2viSowk913dMTvws6sDNbmt8tj',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)

      const transaction = response.data.find(
        ({ txId }) => txId === '0x979b90734ca49ea989e3515de2028196e42762f96f3fa56db24d1c47521075dd'
      ) as FullTransactionsItem & FullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'depositToken')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.token).toEqual(BSNeo3Constants.NEO_TOKEN)
      expect(transaction.data.receiverAddress).toBe('0xe94bea1d8bb8bcc13cd6974e6941f4d1896d56da')
    }, 60000)
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Testnet network', async () => {
      initDoraBDSNeo3(BSNeo3Constants.TESTNET_NETWORKS[0])

      const response = await doraBDSNeo3.exportFullTransactionsByAddress({
        dateFrom: new Date('2025-02-24T20:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'NPpopZhoNx5AompcETfMGMtULCPyH6j93H',
      })

      expect(response.length).toBeGreaterThan(0)
    })

    it('Should be able to export transactions when is using a Mainnet network', async () => {
      const response = await doraBDSNeo3.exportFullTransactionsByAddress({
        address: params.address,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response.length).toBeGreaterThan(0)
    })
  })
})
