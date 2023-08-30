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
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceListInUSD = await flamingoEDSNeo3.getTokenPrices('USD')
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices('BRL')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeGreaterThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const tokenPriceListInUSD = await flamingoEDSNeo3.getTokenPrices('USD')
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices('EUR')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeLessThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })
})
