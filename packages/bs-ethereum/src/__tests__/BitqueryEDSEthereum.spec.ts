import { BitqueryEDSEthereum } from '../BitqueryEDSEthereum'

let bitqueryEDSEthereum: BitqueryEDSEthereum

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    bitqueryEDSEthereum = new BitqueryEDSEthereum('mainnet')
  })
  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('USD')

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceListInUSD = await bitqueryEDSEthereum.getTokenPrices('USD')
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('BRL')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeGreaterThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const tokenPriceListInUSD = await bitqueryEDSEthereum.getTokenPrices('USD')
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('EUR')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeLessThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })
})
