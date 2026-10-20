import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { DefiLlamaCryptoCompareMoralisEDSSolana } from '../services/exchange/DefiLlamaCryptoCompareMoralisEDSSolana'
import { BSUtilsHelper, TBSToken } from '@cityofzion/blockchain-service'

let edsSolana: DefiLlamaCryptoCompareMoralisEDSSolana

// Avoid API key error
describe.skip('DefiLlamaCryptoCompareMoralisEDSSolana', () => {
  beforeAll(() => {
    edsSolana = new DefiLlamaCryptoCompareMoralisEDSSolana(new BSSolana())
  })

  beforeEach(async () => {
    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  it('Should return the ETH price in USD', async () => {
    const response = await edsSolana.getTokenPrices({ tokens: [BSSolanaConstants.NATIVE_TOKEN] })

    expect(response).toHaveLength(1)
    expect(response[0]).toEqual({ usdPrice: expect.any(Number), token: BSSolanaConstants.NATIVE_TOKEN })
  })

  it("Should return the token's price history (SOL)", async () => {
    const response = await edsSolana.getTokenPriceHistory({ token: BSSolanaConstants.NATIVE_TOKEN })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: BSSolanaConstants.NATIVE_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it("Should return the token's price history (USDC)", async () => {
    const usdcToken: TBSToken = {
      symbol: 'USDC',
      name: 'USDC',
      hash: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
    }

    const response = await edsSolana.getTokenPriceHistory({ token: usdcToken })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: usdcToken,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await edsSolana.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await edsSolana.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })
})
