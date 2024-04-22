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
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('BRL')

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('EUR')

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        symbol: expect.any(String),
        hash: expect.any(String),
      })
    })
  })

  it('Should return the ETH price in USD', async () => {
    const tokenPriceList = await bitqueryEDSEthereum.getTokenPrices('USD')

    expect(tokenPriceList).toEqual(expect.arrayContaining([{ symbol: 'ETH', hash: '-', price: expect.any(Number) }]))
  })
})
