import { Network } from '@cityofzion/blockchain-service'
import { BSNeoLegacyHelper } from '../BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from '../CryptoCompareEDSNeoLegacy'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../BsNeoLegacyConstants'

let cryptoCompareEDSNeoLegacy: CryptoCompareEDSNeoLegacy
let network: Network<BSNeoLegacyNetworkId>

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    network = BSNeoLegacyConstants.DEFAULT_NETWORK
    cryptoCompareEDSNeoLegacy = new CryptoCompareEDSNeoLegacy(network)
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices({
      tokens: BSNeoLegacyHelper.getTokens(network),
    })

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
    const ratio = await cryptoCompareEDSNeoLegacy.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await cryptoCompareEDSNeoLegacy.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const token = BSNeoLegacyHelper.getTokens(network).find(token => token.symbol === 'GAS')!
    const tokenPriceHistory = await cryptoCompareEDSNeoLegacy.getTokenPriceHistory({
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
