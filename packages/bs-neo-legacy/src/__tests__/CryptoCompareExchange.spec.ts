import { CryptoCompareEDSNeoLegacy } from '../services/exchange-data/CryptoCompareEDSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { IBSNeoLegacy } from '../types'

let cryptoCompareEDSNeoLegacy: CryptoCompareEDSNeoLegacy<'test'>
let service: IBSNeoLegacy<'test'>

describe('CryptoCompareEDSNeoLegacy', () => {
  beforeAll(() => {
    service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    cryptoCompareEDSNeoLegacy = new CryptoCompareEDSNeoLegacy(service)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices({
      tokens: service.tokens,
    })

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        token: expect.objectContaining({
          decimals: expect.any(Number),
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
        }),
      })
    })
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await cryptoCompareEDSNeoLegacy.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await cryptoCompareEDSNeoLegacy.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const token = BSNeoLegacyConstants.GAS_ASSET
    const tokenPriceHistory = await cryptoCompareEDSNeoLegacy.getTokenPriceHistory({
      token,
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        timestamp: expect.any(Number),
        token,
      })
    })
  })
})
