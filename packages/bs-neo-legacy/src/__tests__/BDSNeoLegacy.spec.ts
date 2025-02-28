import {
  BDSClaimable,
  BlockchainDataService,
  FullTransactionsByAddressParams,
  isLeapDateYear,
  Network,
} from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'

const network = BSNeoLegacyConstants.TESTNET_NETWORKS[0]
const tokens = BSNeoLegacyHelper.getTokens(network)
const gasToken = tokens.find(t => t.symbol === 'GAS')!
const doraBDSNeoLegacy = new DoraBDSNeoLegacy(network, gasToken, gasToken, tokens)

describe('BDSNeoLegacy', () => {
  it.each([doraBDSNeoLegacy])('Should be able to get transaction - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '0x6632e79b1e5182355bcc1f3ca0e91d11a426c893734cd266e7bf3d3f74618add'
    const transaction = await bdsNeoLegacy.getTransaction(hash)
    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        transfers: expect.arrayContaining([
          expect.objectContaining({
            amount: expect.any(String),
            from: expect.any(String),
            to: expect.any(String),
            type: 'token',
          }),
        ]),
        time: expect.any(Number),
        fee: expect.any(String),
      })
    )
  })

  it.each([doraBDSNeoLegacy])(
    'Should be able to get history transactions - %s',
    async (bdsNeoLegacy: BlockchainDataService) => {
      const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
      try {
        const response = await bdsNeoLegacy.getTransactionsByAddress({ address })
        response.transactions.forEach(transaction => {
          expect(transaction).toEqual(
            expect.objectContaining({
              block: expect.any(Number),
              hash: expect.any(String),
              notifications: expect.arrayContaining([
                expect.objectContaining({
                  eventName: expect.any(String),
                  state: expect.arrayContaining([
                    {
                      type: expect.any(String),
                      value: expect.any(String),
                    },
                  ]),
                }),
              ]),
              transfers: expect.arrayContaining([
                expect.objectContaining({
                  amount: expect.any(Number),
                  from: expect.any(String),
                  to: expect.any(String),
                  type: 'asset',
                }),
              ]),
              time: expect.any(Number),
              fee: expect.any(String),
            })
          )
        })
      } catch {
        // Empty block
      }
    }
  )

  it.each([doraBDSNeoLegacy])('Should be able to get contract - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '0x998a0da7ec5f21c9a99ef5349f81af8af89f9644'
    const contract = await bdsNeoLegacy.getContract(hash)
    expect(contract).toEqual({
      hash: hash,
      name: 'Phantasma Stake',
      methods: [],
    })
  })

  it.each([doraBDSNeoLegacy])('Should be able to get token info - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'
    const token = await bdsNeoLegacy.getTokenInfo(hash)
    expect(token).toEqual({
      decimals: 8,
      hash: hash,
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it.each([doraBDSNeoLegacy])('Should be able to get balance - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const balance = await bdsNeoLegacy.getBalance(address)

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
      expect(balance.token.hash.startsWith('0x')).toBeFalsy()
    })
  })

  it.each([doraBDSNeoLegacy])(
    'Should be able to get unclaimed - %s',
    async (doraBDSNeoLegacy: BlockchainDataService & BDSClaimable) => {
      const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
      const unclaimed = await doraBDSNeoLegacy.getUnclaimed(address)
      expect(unclaimed).toEqual(expect.any(String))
    }
  )

  it.each([doraBDSNeoLegacy])('Should be able to get a list of rpc - %s', async (bdsNeo3: BlockchainDataService) => {
    const list = await bdsNeo3.getRpcList()
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
    const customNetwork: Network = { id: 'custom-network', name: 'Custom network', url: 'https://custom-network.com' }
    const address = 'AFnH8Cv7qzuxWZdeLqK9QqTrfPWCq5f8A3'
    let bdsNeoLegacy: DoraBDSNeoLegacy
    let dateFrom: Date
    let dateTo: Date
    let params: FullTransactionsByAddressParams

    beforeEach(() => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setFullYear(dateFrom.getFullYear() - 1)

      if (isLeapDateYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

      params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

      bdsNeoLegacy = new DoraBDSNeoLegacy(BSNeoLegacyConstants.MAINNET_NETWORKS[0], gasToken, gasToken, tokens)
    })

    it("Shouldn't be able to get transactions when is using a different network (Testnet or Custom) from Mainnet", async () => {
      bdsNeoLegacy = new DoraBDSNeoLegacy(network, gasToken, gasToken, tokens)

      await expect(bdsNeoLegacy.getFullTransactionsByAddress(params)).rejects.toThrow('Only Mainnet is supported')

      bdsNeoLegacy = new DoraBDSNeoLegacy(customNetwork, gasToken, gasToken, tokens)

      await expect(bdsNeoLegacy.getFullTransactionsByAddress(params)).rejects.toThrow('Only Mainnet is supported')
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

    it('Should be able to get transactions when is using a Mainnet network', async () => {
      const response = await bdsNeoLegacy.getFullTransactionsByAddress({
        ...params,
        dateFrom: new Date('2025-02-26T12:00:00').toJSON(),
        dateTo: new Date('2025-02-27T12:00:00').toJSON(),
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
    }, 30000)

    it('Should be able to get transactions when send the nextCursor param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-02-23T12:00:00').toJSON(),
        dateTo: new Date('2025-02-25T12:00:00').toJSON(),
      }

      const response = await bdsNeoLegacy.getFullTransactionsByAddress(newParams)
      const nextResponse = await bdsNeoLegacy.getFullTransactionsByAddress({
        ...newParams,
        nextCursor: response.nextCursor,
      })

      expect(response.nextCursor).toBeTruthy()
      expect(response.data.length).toBeTruthy()
      expect(nextResponse.nextCursor).toBeFalsy()
      expect(nextResponse.data.length).toBeTruthy()
    }, 60000)
  })
})
