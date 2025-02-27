import { FullTransactionsByAddressParams, Network } from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'
import { isLeapYear } from 'date-fns'
import { NeoTubeESNeoLegacy } from '../services/explorer/NeoTubeESNeoLegacy'

describe('BDSNeoLegacyFullTransactionsByAddress', () => {
  describe('getFullTransactionsByAddress', () => {
    const address = 'AFnH8Cv7qzuxWZdeLqK9QqTrfPWCq5f8A3'
    let dateFrom: Date
    let dateTo: Date
    let params: FullTransactionsByAddressParams
    let bdsNeoLegacy: DoraBDSNeoLegacy

    const initBDSNeoLegacy = (network: Network) => {
      const tokens = BSNeoLegacyHelper.getTokens(network)
      const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')!
      const explorerService = new NeoTubeESNeoLegacy(network) as jest.Mocked<NeoTubeESNeoLegacy>

      explorerService.getAddressTemplateUrl = jest.fn().mockReturnValue('addressTemplateUrl')
      explorerService.getTxTemplateUrl = jest.fn().mockReturnValue('txTemplateUrl')
      explorerService.getNftTemplateUrl = jest.fn().mockReturnValue('nftTemplateUrl')
      explorerService.getContractTemplateUrl = jest.fn().mockReturnValue('contractTemplateUrl')

      bdsNeoLegacy = new DoraBDSNeoLegacy(network, gasToken, gasToken, tokens, explorerService)
    }

    beforeEach(() => {
      dateFrom = new Date()
      dateTo = new Date()

      dateFrom.setFullYear(dateFrom.getFullYear() - 1)

      if (isLeapYear(dateFrom)) dateFrom.setDate(dateFrom.getDate() + 1)

      params = { address, dateTo: dateTo.toJSON(), dateFrom: dateFrom.toJSON() }

      initBDSNeoLegacy(BSNeoLegacyConstants.MAINNET_NETWORKS[0])
    })

    it("Shouldn't be able to get transactions when is using a different network (Testnet or Custom) from Mainnet", async () => {
      initBDSNeoLegacy(BSNeoLegacyConstants.TESTNET_NETWORKS[0])

      await expect(bdsNeoLegacy.getFullTransactionsByAddress(params)).rejects.toThrow('Only Mainnet is supported')

      initBDSNeoLegacy({ id: 'custom-network', name: 'Custom network', url: 'https://custom-network.com' })

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
    }, 30000)

    it('Should be able to get transactions when send the nextCursor param', async () => {
      const newParams = {
        ...params,
        dateFrom: new Date('2025-04-23T12:00:00').toJSON(),
        dateTo: new Date('2025-04-25T12:00:00').toJSON(),
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
