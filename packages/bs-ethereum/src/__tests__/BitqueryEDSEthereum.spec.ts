import { BSEthereumHelper } from '../BSEthereumHelper'
import { BitqueryEDSEthereum } from '../BitqueryEDSEthereum'

let bitqueryEDSEthereum: BitqueryEDSEthereum

describe.skip('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    const network = BSEthereumHelper.DEFAULT_NETWORK
    const token = BSEthereumHelper.getNativeAsset(network)
    bitqueryEDSEthereum = new BitqueryEDSEthereum(network, [token])
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

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await bitqueryEDSEthereum.getTokenPriceHistory({
      tokenSymbol: 'ETH',
      currency: 'USD',
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        price: expect.any(Number),
        timestamp: expect.any(Number),
        symbol: 'ETH',
        hash: expect.any(String),
      })
    })
  })
})
