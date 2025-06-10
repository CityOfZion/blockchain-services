import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from '../services/explorer/NeoTubeESNeoLegacy'

const network = BSNeoLegacyConstants.MAINNET_NETWORKS[0]
const tokens = BSNeoLegacyHelper.getTokens(network)
const gasToken = tokens.find(token => token.symbol === 'GAS')!
const doraBDSNeoLegacy = new DoraBDSNeoLegacy(network, gasToken, gasToken, tokens, new NeoTubeESNeoLegacy(network))

describe('DoraBDSNeoLegacy', () => {
  it('Should be able to get transaction - %s', async () => {
    const hash = '0xa7517641bf2d6e9683d66c0d58221e3d1b46b616a2231cd7c7d4a611ce825cc8'
    const transaction = await doraBDSNeoLegacy.getTransaction(hash)
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

  it('Should be able to get history transactions - %s', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'

    const response = await doraBDSNeoLegacy.getTransactionsByAddress({ address })
    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
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
        })
      )
    })
  })

  it.skip('Should be able to get contract - %s', async () => {
    const hash = '0x998a0da7ec5f21c9a99ef5349f81af8af89f9644'
    const contract = await doraBDSNeoLegacy.getContract(hash)
    expect(contract).toEqual({
      hash: hash,
      name: 'Phantasma Stake',
      methods: [],
    })
  })

  it('Should be able to get token info - %s', async () => {
    const hash = '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'
    const token = await doraBDSNeoLegacy.getTokenInfo(hash)
    expect(token).toEqual({
      decimals: 8,
      hash: hash,
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance - %s', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const balance = await doraBDSNeoLegacy.getBalance(address)

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
  })

  it('Should be able to get unclaimed - %s', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const unclaimed = await doraBDSNeoLegacy.getUnclaimed(address)
    expect(unclaimed).toEqual(expect.any(String))
  })

  it('Should be able to get a list of rpc - %s', async () => {
    const list = await doraBDSNeoLegacy.getRpcList()
    expect(list.length).toBeGreaterThan(0)
    list.forEach(rpc => {
      expect(rpc).toEqual({
        height: expect.any(Number),
        latency: expect.any(Number),
        url: expect.any(String),
      })
    })
  }, 60000)
})
