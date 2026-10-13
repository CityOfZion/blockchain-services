import { BSUtilsHelper, TBSToken } from '@cityofzion/blockchain-service'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import { DefiLlamaCryptoCompareRpcEDSStellar } from '../services/exchange/DefiLlamaCryptoCompareRpcEDSStellar'
import { BSStellar } from '../BSStellar'

const usdcToken: TBSToken = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  hash: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
}

let edsStellar: DefiLlamaCryptoCompareRpcEDSStellar

// Avoid API key error
describe.skip('DefiLlamaCryptoCompareRpcEDSStellar', () => {
  beforeAll(() => {
    edsStellar = new DefiLlamaCryptoCompareRpcEDSStellar(new BSStellar(BSStellarConstants.MAINNET_NETWORK))
  })

  beforeEach(async () => {
    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  it('Should return the XLM price', async () => {
    const response = await edsStellar.getTokenPrices({ tokens: [BSStellarConstants.NATIVE_TOKEN] })

    expect(response).toHaveLength(1)
    expect(response[0]).toEqual({ usdPrice: expect.any(Number), token: BSStellarConstants.NATIVE_TOKEN })
  })

  it('Should return the USDC price', async () => {
    const response = await edsStellar.getTokenPrices({ tokens: [usdcToken] })
    const usdcTokenPrice = response[0]

    expect(response).toHaveLength(1)
    expect(usdcTokenPrice).toEqual({ usdPrice: expect.any(Number), token: usdcToken })
    expect(usdcTokenPrice.usdPrice).toBeGreaterThanOrEqual(0.99)
    expect(usdcTokenPrice.usdPrice).toBeLessThanOrEqual(1.01)
  })

  it('Should return the AQUA price', async () => {
    const aquaToken: TBSToken = {
      symbol: 'AQUA',
      name: 'AQUA Token',
      decimals: 7,
      hash: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    }

    const response = await edsStellar.getTokenPrices({ tokens: [aquaToken] })

    expect(response).toHaveLength(1)
    expect(response[0]).toEqual({ usdPrice: expect.any(Number), token: aquaToken })
  })

  it("Should return the token's price history (XLM)", async () => {
    const response = await edsStellar.getTokenPriceHistory({ token: BSStellarConstants.NATIVE_TOKEN })

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: BSStellarConstants.NATIVE_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])
    )
  })

  it("Should return the token's price history (USDC)", async () => {
    const response = await edsStellar.getTokenPriceHistory({ token: usdcToken })

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
    const ratio = await edsStellar.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await edsStellar.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })
})
