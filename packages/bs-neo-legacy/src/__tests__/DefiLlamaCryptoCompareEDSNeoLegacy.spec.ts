import { DefiLlamaCryptoCompareEDSNeoLegacy } from '../services/exchange-data/DefiLlamaCryptoCompareEDSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacy } from '../BSNeoLegacy'
import type { IBSNeoLegacy } from '../types'
import { BSUtilsHelper } from '@cityofzion/blockchain-service'

let service: IBSNeoLegacy
let edsNeoLegacy: DefiLlamaCryptoCompareEDSNeoLegacy

// Avoid API key error
describe.skip('DefiLlamaCryptoCompareEDSNeoLegacy', () => {
  beforeAll(() => {
    service = new BSNeoLegacy(BSNeoLegacyConstants.MAINNET_NETWORK)
    edsNeoLegacy = new DefiLlamaCryptoCompareEDSNeoLegacy(service)
  })

  beforeEach(async () => {
    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const response = await edsNeoLegacy.getTokenPrices({ tokens: service.tokens })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          usdPrice: expect.any(Number),
          token: expect.objectContaining({
            symbol: expect.any(String),
            name: expect.any(String),
            hash: expect.any(String),
            decimals: expect.any(Number),
          }),
        },
      ])
    )
  })

  it("Should return the token's price history (GAS)", async () => {
    const token = BSNeoLegacyConstants.GAS_ASSET
    const response = await edsNeoLegacy.getTokenPriceHistory({ token })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it("Should return the token's price history (NEO)", async () => {
    const token = BSNeoLegacyConstants.NEO_ASSET
    const response = await edsNeoLegacy.getTokenPriceHistory({ token })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await edsNeoLegacy.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await edsNeoLegacy.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })
})
