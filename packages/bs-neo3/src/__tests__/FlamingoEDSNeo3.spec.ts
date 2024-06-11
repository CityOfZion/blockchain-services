import { FlamingoEDSNeo3 } from '../FlamingoEDSNeo3'

let flamingoEDSNeo3: FlamingoEDSNeo3

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    flamingoEDSNeo3 = new FlamingoEDSNeo3('mainnet')
  })
  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices('USD')

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceListInUSD = await flamingoEDSNeo3.getTokenPrices('USD')
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices('BRL')

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
    const tokenPriceListInUSD = await flamingoEDSNeo3.getTokenPrices('USD')
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices('EUR')

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
    const tokenPriceHistory = await flamingoEDSNeo3.getTokenPriceHistory({
      tokenSymbol: 'NEO',
      currency: 'USD',
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        timestamp: expect.any(Number),
        symbol: 'NEO',
        hash: expect.any(String),
      })
    })
  })
})
