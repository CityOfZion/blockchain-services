import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { DoraBDSNeo3 } from '../../../services/blockchain-data/DoraBDSNeo3'
import {
  TFullTransactionNftEvent,
  TFullTransactionsByAddressParams,
  TFullTransactionsItem,
  TFullTransactionsItemBridgeNeo3NeoX,
  TBSNetwork,
} from '@cityofzion/blockchain-service'
import { isLeapYear } from 'date-fns'
import { BSNeo3 } from '../../../BSNeo3'

const invalidNetwork: TBSNetwork = {
  id: 'other-network',
  name: 'Other network',
  url: 'https://other-network.com',
  type: 'custom',
}

const address = 'NYnfAZTcVfSfNgk4RnP2DBNgosq2tUN3U2'

let dateFrom: Date
let dateTo: Date
let params: TFullTransactionsByAddressParams

let service: BSNeo3<'test'>
let doraBDSNeo3: DoraBDSNeo3<'test'>

jest.mock('../../../services/nft-data/GhostMarketNDSNeo3', () => {
  return {
    GhostMarketNDSNeo3: jest.fn().mockImplementation(() => {
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

jest.mock('../../../services/explorer/DoraESNeo3', () => {
  return {
    DoraESNeo3: jest.fn().mockImplementation(() => {
      return {
        getAddressTemplateUrl: jest.fn().mockReturnValue('addressTemplateUrl'),
        getTxTemplateUrl: jest.fn().mockReturnValue('txTemplateUrl'),
        getNftTemplateUrl: jest.fn().mockReturnValue('nftTemplateUrl'),
        getContractTemplateUrl: jest.fn().mockReturnValue('contractTemplateUrl'),
      }
    }),
  }
})

describe('DoraBDSNeo3 - fullTransactionsByAddress', () => {
  beforeEach(() => {
    dateFrom = new Date()
    dateTo = new Date()

    dateFrom.setFullYear(dateFrom.getFullYear() - 1)

    if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

    params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

    service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    doraBDSNeo3 = new DoraBDSNeo3(service)
  })

  describe('getFullTransactionsByAddress', () => {
    it("Shouldn't be able to get transactions when is using a different network (Custom) from Mainnet and Testnet", async () => {
      service = new BSNeo3('test', invalidNetwork)
      doraBDSNeo3 = new DoraBDSNeo3(service)

      await expect(doraBDSNeo3.getFullTransactionsByAddress(params)).rejects.toThrow('Network not supported')
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
      service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
      doraBDSNeo3 = new DoraBDSNeo3(service)

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
                tokenType: expect.any(String),
              }),
            ]),
          }),
        ]),
      })
    })

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
    })

    it('Should be able to get transactions with NFTs when it was called', async () => {
      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-04-22T03:00:00').toJSON(),
        dateTo: new Date('2025-03-22T03:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
        nextCursor: 'NTcyNTEwOA==',
      })

      const nftEvents = response.data
        .flatMap(({ events }) => events)
        .filter(({ eventType }) => eventType === 'nft') as TFullTransactionNftEvent[]

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
            tokenType: 'nep-11',
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
        dateFrom: new Date('2024-08-20T12:00:00').toJSON(),
        dateTo: new Date('2025-05-20T12:00:00').toJSON(),
        address: 'NeM8SHQsDCX54A12xa3ZbvWb4a7xiwYtdJ',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBe(50)
    })

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
      ) as TFullTransactionsItem & TFullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'NativeDeposit')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.token).toEqual(service.neo3NeoXBridgeService.gasToken)
      expect(transaction.data.receiverAddress).toBe('0xa911a7fa0901cfc3f1da55a05593823e32e2f1a9')
    })

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
      ) as TFullTransactionsItem & TFullTransactionsItemBridgeNeo3NeoX

      expect(transaction.type).toBe('bridgeNeo3NeoX')
      expect(transaction.events.find(event => event.methodName === 'TokenDeposit')).toBeTruthy()
      expect(transaction.data.amount).toBe('1')
      expect(transaction.data.token).toEqual(service.neo3NeoXBridgeService.neoToken)
      expect(transaction.data.receiverAddress).toBe('0xe94bea1d8bb8bcc13cd6974e6941f4d1896d56da')
    })
  })

  describe('exportFullTransactionsByAddress', () => {
    it('Should be able to export transactions when is using a Testnet network', async () => {
      service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
      doraBDSNeo3 = new DoraBDSNeo3(service)

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
