import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import { TrustlineServiceStellar } from '../services/trustline/TrustlineServiceStellar'

let trustlineServiceStellar: TrustlineServiceStellar

describe('TrustlineServiceStellar', () => {
  beforeEach(async () => {
    const service = new BSStellar(BSStellarConstants.TESTNET_NETWORK)
    trustlineServiceStellar = new TrustlineServiceStellar(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  it('Should be able to check if an address has a trustline', async () => {
    const address = 'GAIYCJMFIEZDTPFQ7RDPL35AFGJHEKDYF6VCT2ESBH3QVD6FLJ7IPPMQ'
    const token = {
      symbol: 'BTC',
      name: 'BTC',
      decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
      hash: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    }

    const hasTrustline = await trustlineServiceStellar.hasTrustline({ address, token })

    expect(hasTrustline).toBe(false)
  })

  it('Should be able to get trustlines of an address', async () => {
    const address = 'GAIYCJMFIEZDTPFQ7RDPL35AFGJHEKDYF6VCT2ESBH3QVD6FLJ7IPPMQ'
    const trustlines = await trustlineServiceStellar.getTrustlines(address)

    expect(trustlines.length).toBeGreaterThan(0)
    trustlines.forEach(trustline => {
      expect(trustline).toEqual(
        expect.objectContaining({
          token: expect.objectContaining({
            hash: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
          }),
          limit: expect.any(String),
        })
      )
    })
  })

  it('Should not include the native token in the trustlines', async () => {
    const address = 'GAIYCJMFIEZDTPFQ7RDPL35AFGJHEKDYF6VCT2ESBH3QVD6FLJ7IPPMQ'
    const trustlines = await trustlineServiceStellar.getTrustlines(address)

    const hasNativeToken = trustlines.some(trustline => trustline.token.hash === BSStellarConstants.NATIVE_TOKEN.hash)
    expect(hasNativeToken).toBe(false)
  })

  it('Should be able to get all tokens by code', async () => {
    const tokens = await trustlineServiceStellar.getAllTokens({ code: 'BTC' })

    expect(tokens.length).toBeGreaterThan(0)
    tokens.forEach(token => {
      expect(token).toEqual(
        expect.objectContaining({
          symbol: 'BTC',
          hash: expect.any(String),
          decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
          name: 'BTC',
        })
      )
    })
  })
})
