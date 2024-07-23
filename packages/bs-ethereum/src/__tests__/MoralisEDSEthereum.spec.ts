import { Network } from '@cityofzion/blockchain-service'
import { BSEthereumHelper, BSEthereumNetworkId } from '../BSEthereumHelper'
import { MoralisBDSEthereum } from '../MoralisBDSEthereum'
import { MoralisEDSEthereum } from '../MoralisEDSEthereum'

let moralisEDSEthereum: MoralisEDSEthereum
let network: Network<BSEthereumNetworkId>

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    network = BSEthereumHelper.DEFAULT_NETWORK
    const moralisBDSEthereum = new MoralisBDSEthereum(network)
    moralisEDSEthereum = new MoralisEDSEthereum(network, moralisBDSEthereum)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await moralisEDSEthereum.getTokenPrices({
      tokens: [BSEthereumHelper.getNativeAsset(network)],
    })

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        token: BSEthereumHelper.getNativeAsset(network),
      })
    })
  }, 60000)

  it('Should return the BRL currency ratio', async () => {
    const ratio = await moralisEDSEthereum.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await moralisEDSEthereum.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await moralisEDSEthereum.getTokenPriceHistory({
      token: BSEthereumHelper.getNativeAsset(network),
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        timestamp: expect.any(Number),
        token: BSEthereumHelper.getNativeAsset(network),
      })
    })
  }, 60000)
})
