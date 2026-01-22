import { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { FlamingoForthewinEDSNeo3 } from '../../services/exchange-data/FlamingoForthewinEDSNeo3'
import { TBSNeo3NetworkId } from '../../types'
import { BSNeo3 } from '../../BSNeo3'

let flamingoForthewinEDSNeo3: FlamingoForthewinEDSNeo3<'test'>
let network: TBSNetwork<TBSNeo3NetworkId>

describe('FlamingoForthewinEDSNeo3', () => {
  beforeAll(() => {
    network = BSNeo3Constants.MAINNET_NETWORK
    const service = new BSNeo3('test', network)
    flamingoForthewinEDSNeo3 = new FlamingoForthewinEDSNeo3(service)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await flamingoForthewinEDSNeo3.getTokenPrices({ tokens: BSNeo3Helper.getTokens(network) })

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
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await flamingoForthewinEDSNeo3.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await flamingoForthewinEDSNeo3.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const token = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'GAS')!
    const tokenPriceHistory = await flamingoForthewinEDSNeo3.getTokenPriceHistory({
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
  })
})
