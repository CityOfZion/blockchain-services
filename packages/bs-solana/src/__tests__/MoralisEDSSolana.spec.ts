import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { MoralisEDSSolana } from '../services/exchange/MoralisEDSSolana'

let moralisEDSSolana: MoralisEDSSolana
const network = BSSolanaConstants.MAINNET_NETWORKS[0]

describe('MoralisEDSEthereum', () => {
  beforeAll(() => {
    moralisEDSSolana = new MoralisEDSSolana(network, process.env.MORALIS_API_KEY!)
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
  }, 60000)

  it('Should return the BRL currency ratio', async () => {
    const ratio = await moralisEDSSolana.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  }, 20000)

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
  }, 60000)
})
