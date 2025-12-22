import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { MoralisEDSSolana } from '../services/exchange/MoralisEDSSolana'

let moralisEDSSolana: MoralisEDSSolana<'test'>

describe('MoralisEDSSolana', () => {
  beforeAll(() => {
    const service = new BSSolana('test')
    moralisEDSSolana = new MoralisEDSSolana(service)
  })

  it('Should return the ETH price in USD', async () => {
    const tokenPriceList = await moralisEDSSolana.getTokenPrices({
      tokens: [BSSolanaConstants.NATIVE_TOKEN],
    })
    expect(tokenPriceList).toHaveLength(1)
    expect(tokenPriceList[0]).toEqual({
      usdPrice: expect.any(Number),
      token: BSSolanaConstants.NATIVE_TOKEN,
    })
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await moralisEDSSolana.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await moralisEDSSolana.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await moralisEDSSolana.getTokenPriceHistory({
      token: BSSolanaConstants.NATIVE_TOKEN,
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        timestamp: expect.any(Number),
        token: BSSolanaConstants.NATIVE_TOKEN,
      })
    })
  })
})
