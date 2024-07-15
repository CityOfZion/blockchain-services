import { BSNeoLegacyHelper } from '../BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from '../CryptoCompareEDSNeoLegacy'

let cryptoCompareEDSNeoLegacy: CryptoCompareEDSNeoLegacy

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    const network = BSNeoLegacyHelper.DEFAULT_NETWORK
    const tokens = BSNeoLegacyHelper.getTokens(network)
    cryptoCompareEDSNeoLegacy = new CryptoCompareEDSNeoLegacy(network.id, tokens)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')
    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceListInUSD = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('BRL')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.price).toBeGreaterThan(tokenPriceListInUSD[index].price)
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const tokenPriceListInUSD = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('EUR')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.price).toBeLessThan(tokenPriceListInUSD[index].price)
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await cryptoCompareEDSNeoLegacy.getTokenPriceHistory({
      tokenSymbol: 'GAS',
      currency: 'USD',
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        timestamp: expect.any(Number),
        symbol: 'GAS',
        hash: expect.any(String),
      })
    })
  })
})
