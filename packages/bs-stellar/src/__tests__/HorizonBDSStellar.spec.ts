import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { HorizonBDSStellar } from '../services/blockchain-data/HorizonBDSStellar'
import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'

let horizonBDSStellar: HorizonBDSStellar

describe('HorizonBDSStellar', () => {
  beforeEach(async () => {
    const service = new BSStellar(BSStellarConstants.TESTNET_NETWORK)
    horizonBDSStellar = new HorizonBDSStellar(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  it('Should be able to get a transaction', async () => {
    const hash = 'a8a9bbe1b24d132c927dc13df965b08bb67badd26729af5c9233463c330d87c6'
    const transaction = await horizonBDSStellar.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        networkFeeAmount: expect.anything(),
        view: 'default',
      })
    )

    transaction.events.forEach(event => {
      expect(event).toEqual(
        expect.toBeOneOf([
          expect.objectContaining({
            eventType: 'token',
            amount: expect.any(String),
            methodName: expect.any(String),
            from: expect.any(String),
            fromUrl: expect.any(String),
            to: expect.any(String),
            toUrl: expect.any(String),
            token: expect.objectContaining({
              decimals: expect.any(Number),
              symbol: expect.any(String),
              name: expect.any(String),
              hash: expect.any(String),
            }),
          }),
          expect.objectContaining({
            eventType: 'generic',
            methodName: 'change_trust',
            from: expect.any(String),
            fromUrl: expect.any(String),
            data: {
              limit: expect.any(String),
              token: expect.any(String),
            },
          }),
        ])
      )
    })
  })

  it('Should be able to get transactions of address', async () => {
    const address = 'GAIYCJMFIEZDTPFQ7RDPL35AFGJHEKDYF6VCT2ESBH3QVD6FLJ7IPPMQ'
    const response = await horizonBDSStellar.getTransactionsByAddress({ address: address })

    expect(response.transactions.length).toBeGreaterThan(0)
    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          networkFeeAmount: expect.anything(),
          view: 'default',
        })
      )

      transaction.events.forEach(event => {
        expect(event).toEqual(
          expect.toBeOneOf([
            expect.objectContaining({
              eventType: 'token',
              amount: expect.any(String),
              methodName: expect.any(String),
              from: expect.any(String),
              fromUrl: expect.any(String),
              to: expect.any(String),
              toUrl: expect.any(String),
              token: expect.objectContaining({
                decimals: expect.any(Number),
                symbol: expect.any(String),
                name: expect.any(String),
                hash: expect.any(String),
              }),
            }),
            expect.objectContaining({
              eventType: 'generic',
              methodName: 'change_trust',
              from: expect.any(String),
              fromUrl: expect.any(String),
              data: {
                limit: expect.any(String),
                token: expect.any(String),
              },
            }),
          ])
        )
      })
    })
  })

  it('Should be able to get the native token info', async () => {
    const tokenInfo = await horizonBDSStellar.getTokenInfo(BSStellarConstants.NATIVE_TOKEN.hash)
    expect(tokenInfo).toEqual(BSStellarConstants.NATIVE_TOKEN)
  })

  it('Should be able to get token info', async () => {
    const tokenInfo = await horizonBDSStellar.getTokenInfo('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')
    expect(tokenInfo).toEqual({
      hash: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      name: 'BTC',
      symbol: 'BTC',
      decimals: 7,
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'GAIYCJMFIEZDTPFQ7RDPL35AFGJHEKDYF6VCT2ESBH3QVD6FLJ7IPPMQ'
    const balance = await horizonBDSStellar.getBalance(address)

    expect(balance.length).toBeGreaterThan(0)
    balance.forEach(balance => {
      expect(balance).toEqual(
        expect.objectContaining({
          amount: expect.any(String),
          token: {
            hash: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
          },
        })
      )
    })
  })

  it('Should be able to get block height', async () => {
    const blockHeight = await horizonBDSStellar.getBlockHeight()
    expect(blockHeight).toBeGreaterThan(0)
  })
})
