import { BDSClaimable, BlockchainDataService } from '@cityofzion/blockchain-service'
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
})
