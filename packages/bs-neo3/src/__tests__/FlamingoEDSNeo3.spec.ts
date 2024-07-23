import { Network } from '@cityofzion/blockchain-service'
import { BSNeo3Helper, BSNeo3NetworkId } from '../BSNeo3Helper'
import { FlamingoEDSNeo3 } from '../FlamingoEDSNeo3'

let flamingoEDSNeo3: FlamingoEDSNeo3
let network: Network<BSNeo3NetworkId>

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    network = BSNeo3Helper.DEFAULT_NETWORK
    flamingoEDSNeo3 = new FlamingoEDSNeo3(network)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await flamingoEDSNeo3.getTokenPrices({ tokens: BSNeo3Helper.getTokens(network) })

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
  }, 60000)

  it('Should return the BRL currency ratio', async () => {
    const ratio = await flamingoEDSNeo3.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await flamingoEDSNeo3.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const token = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'GAS')!
    const tokenPriceHistory = await flamingoEDSNeo3.getTokenPriceHistory({
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
  }, 60000)
})
