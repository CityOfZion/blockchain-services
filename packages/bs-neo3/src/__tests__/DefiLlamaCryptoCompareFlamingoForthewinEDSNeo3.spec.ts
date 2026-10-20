import { BSUtilsHelper, TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../helpers/BSNeo3Helper'
import { DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3 } from '../services/exchange-data/DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3'
import type { TBSNeo3NetworkId } from '../types'
import { BSNeo3 } from '../BSNeo3'

let network: TBSNetwork<TBSNeo3NetworkId>
let edsNeo3: DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3

// Avoid API key error
describe.skip('DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3', () => {
  beforeAll(() => {
    network = BSNeo3Constants.MAINNET_NETWORK
    edsNeo3 = new DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3(new BSNeo3(network))
  })

  beforeEach(async () => {
    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const response = await edsNeo3.getTokenPrices({ tokens: BSNeo3Helper.getTokens(network) })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          usdPrice: expect.any(Number),
          token: expect.objectContaining({
            symbol: expect.any(String),
            name: expect.any(String),
            hash: expect.any(String),
            decimals: expect.any(Number),
          }),
        },
      ])
    )
  })

  it("Should return the token's price history (GAS)", async () => {
    const response = await edsNeo3.getTokenPriceHistory({ token: BSNeo3Constants.GAS_TOKEN })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: BSNeo3Constants.GAS_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it("Should return the token's price history (NEO)", async () => {
    const response = await edsNeo3.getTokenPriceHistory({ token: BSNeo3Constants.NEO_TOKEN })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: BSNeo3Constants.NEO_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await edsNeo3.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await edsNeo3.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })
})
