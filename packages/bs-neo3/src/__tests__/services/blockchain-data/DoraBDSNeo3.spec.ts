import { BSNeo3Constants, BSNeo3NetworkId } from '../../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../../helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from '../../../services/blockchain-data/DoraBDSNeo3'
import {
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  isLeapDateYear,
  Network,
} from '@cityofzion/blockchain-service'
import { GhostMarketNDSNeo3 } from '../../../services/nft-data/GhostMarketNDSNeo3'
import { RpcNDSNeo3 } from '../../../services/nft-data/RpcNDSNeo3'

const network = BSNeo3Constants.TESTNET_NETWORKS[0]
const tokens = BSNeo3Helper.getTokens(network)

const GAS = tokens.find(token => token.symbol === 'GAS')!

let nftDataService: RpcNDSNeo3
let doraBDSNeo3: DoraBDSNeo3

const mockNftDataService = (network: Network<BSNeo3NetworkId>) => {
  nftDataService = new GhostMarketNDSNeo3(network) as jest.Mocked<GhostMarketNDSNeo3>

  nftDataService.getNft = jest
    .fn()
    .mockReturnValue({ image: 'nftImage', name: 'nftName', collectionName: 'nftCollectionName' })
}

describe('DoraBDSNeo3', () => {
  beforeEach(() => {
    mockNftDataService(network)

    doraBDSNeo3 = new DoraBDSNeo3(network, GAS, GAS, tokens, nftDataService)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x70e7381c5dee6e81becd02844e4e0199f6b3df834213bc89418dc4da32cf3f21'
    const transaction = await doraBDSNeo3.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        transfers: [],
        time: expect.any(Number),
        fee: expect.any(String),
      })
    )
  })

  it('Should be able to get transactions of address', async () => {
    const address = 'NRwXs5yZRMuuXUo7AqvetHQ4GDHe3pV7Mb'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address, nextPageParams: 1 })

    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
          time: expect.any(Number),
          fee: expect.any(String),
          notifications: expect.arrayContaining([
            expect.objectContaining({
              eventName: expect.any(String),
              state: expect.objectContaining({
                type: expect.any(String),
                value: expect.arrayContaining([
                  expect.objectContaining({
                    value: expect.any(String),
                  }),
                  expect.objectContaining({
                    type: expect.any(String),
                    value: expect.any(String),
                  }),
                ]),
              }),
            }),
          ]),
          transfers: expect.arrayContaining([
            expect.objectContaining({
              amount: expect.any(String),
              contractHash: expect.any(String),
              from: expect.any(String),
              to: expect.any(String),
              type: expect.any(String),
              token: expect.objectContaining({
                decimals: expect.any(Number),
                hash: expect.any(String),
                name: expect.any(String),
                symbol: expect.any(String),
              }),
            }),
          ]),
        })
      )
    })
  })

  it('Should be able to get contract', async () => {
    const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
    const contract = await doraBDSNeo3.getContract(hash)

    expect(contract).toEqual({
      hash: hash,
      name: 'GasToken',
      methods: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          parameters: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(String), type: expect.any(String) }),
          ]),
        }),
      ]),
    })
  })

  it('Should be able to get token info', async () => {
    const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
    const token = await doraBDSNeo3.getTokenInfo(hash)

    expect(token).toEqual({
      decimals: 8,
      hash,
      name: 'GasToken',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const balance = await doraBDSNeo3.getBalance(address)

    balance.forEach(balance => {
      expect(balance).toEqual({
        amount: expect.any(String),
        token: {
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
          decimals: expect.any(Number),
        },
      })
    })
  }, 10000)

  it('Should be able to get unclaimed', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const unclaimed = await doraBDSNeo3.getUnclaimed(address)

    expect(unclaimed).toEqual(expect.any(String))
  })

  it('Should be able to get a list of rpc', async () => {
    const list = await doraBDSNeo3.getRpcList()

    expect(list.length).toBeGreaterThan(0)

    list.forEach(rpc => {
      expect(rpc).toEqual({
        height: expect.any(Number),
        latency: expect.any(Number),
        url: expect.any(String),
      })
    })
  })

  describe('getFullTransactionsByAddress', () => {
    const otherNetwork: Network = { id: 'other-network', name: 'Other network', url: 'https://other-network.com' }
    const address = 'NYnfAZTcVfSfNgk4RnP2DBNgosq2tUN3U2'
    let dateFrom: Date
    let dateTo: Date
    let params: FullTransactionsByAddressParams

    const getDoraBDSNeo3Mainnet = () => {
      const network = BSNeo3Constants.MAINNET_NETWORKS[0]
      const tokens = BSNeo3Helper.getTokens(network)
      const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')!

      mockNftDataService(network)

      return new DoraBDSNeo3(network, gasToken, gasToken, tokens, nftDataService)
    }

    beforeEach(() => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setFullYear(dateFrom.getFullYear() - 1)

      if (isLeapDateYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

      params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }
    })

    it("Shouldn't be able to get transactions when is using a different network (Custom) from Mainnet and Testnet", async () => {
      doraBDSNeo3 = new DoraBDSNeo3(otherNetwork, GAS, GAS, tokens, new GhostMarketNDSNeo3(network))

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

    it('Should be able to get transactions when is using a Testnet network', async () => {
      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-02-24T20:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'NPpopZhoNx5AompcETfMGMtULCPyH6j93H',
      })

      expect(response).toEqual({
        nextCursor: expect.any(String),
        data: expect.arrayContaining([
          expect.objectContaining({
            txId: expect.any(String),
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
                from: expect.any(String),
                to: expect.any(String),
                hash: expect.any(String),
                token: null,
                tokenType: expect.any(String),
              }),
            ]),
          }),
        ]),
      })
    }, 30000)

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      doraBDSNeo3 = getDoraBDSNeo3Mainnet()

      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      })

      expect(response).toEqual({
        nextCursor: expect.any(String),
        data: expect.arrayContaining([
          expect.objectContaining({
            txId: expect.any(String),
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
                from: expect.any(String),
                to: expect.any(String),
                hash: expect.any(String),
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
      doraBDSNeo3 = getDoraBDSNeo3Mainnet()

      const newParams = {
        ...params,
        dateFrom: new Date('2025-01-25T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
        address: 'Nc6LJ79RodHzaz5BghHGChMZYRa9GqJvES',
      }

      const response = await doraBDSNeo3.getFullTransactionsByAddress(newParams)
      const nextResponse = await doraBDSNeo3.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.nextCursor).toBeFalsy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)

    it('Should be able to get transactions with NFTs when it was called', async () => {
      doraBDSNeo3 = getDoraBDSNeo3Mainnet()

      const response = await doraBDSNeo3.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2024-03-22T12:00:00').toJSON(),
        dateTo: new Date('2025-02-22T12:00:00').toJSON(),
        address: 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR',
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
            from: expect.any(String),
            to: expect.any(String),
            hash: expect.any(String),
            tokenId: expect.any(String),
            tokenType: 'nep11',
            nftImageUrl: 'nftImage',
            name: 'nftName',
            collectionName: 'nftCollectionName',
          }),
        ])
      )
    }, 30000)
  })
})
