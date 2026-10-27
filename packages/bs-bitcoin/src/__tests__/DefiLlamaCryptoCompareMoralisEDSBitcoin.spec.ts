import { BSUtilsHelper, DefiLlamaCryptoCompareEDS, type TBSToken } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { DefiLlamaCryptoCompareMoralisEDSBitcoin } from '../services/exchange-data/DefiLlamaCryptoCompareMoralisEDSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

const ordiToken: TBSToken = {
  symbol: 'ORDI',
  name: 'ORDI',
  hash: 'b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0',
  decimals: 18,
}

const satsToken: TBSToken = {
  symbol: 'SATS',
  name: 'SATS',
  hash: '9b664bdd6f5ed80d8d88957b63364c41f3ad4efb8eee11366aa16435974d9333i0',
  decimals: 18,
}

let exchangeDataService: DefiLlamaCryptoCompareMoralisEDSBitcoin

// Avoid API key error
describe.skip('DefiLlamaCryptoCompareMoralisEDSBitcoin', () => {
  beforeEach(() => {
    exchangeDataService = new DefiLlamaCryptoCompareMoralisEDSBitcoin(new BSBitcoin())
  })

  beforeEach(async () => {
    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should be able to get the token prices', async () => {
    const tokenPrices = await exchangeDataService.getTokenPrices({
      tokens: [BSBitcoinConstants.NATIVE_TOKEN, ordiToken, satsToken],
    })

    expect(tokenPrices).toEqual(
      expect.arrayContaining([
        {
          usdPrice: expect.any(Number),
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
        {
          usdPrice: expect.any(Number),
          token: ordiToken,
        },
        {
          usdPrice: expect.any(Number),
          token: satsToken,
        },
      ])
    )
  })

  it('Should be able to get the token price history', async () => {
    const btcTokenPriceHistory = await exchangeDataService.getTokenPriceHistory({
      token: BSBitcoinConstants.NATIVE_TOKEN,
    })

    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)

    const ordiTokenPriceHistory = await exchangeDataService.getTokenPriceHistory({ token: ordiToken })

    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)

    const satsTokenPriceHistory = await exchangeDataService.getTokenPriceHistory({ token: satsToken })

    expect(btcTokenPriceHistory).toEqual(
      expect.arrayContaining([
        {
          timestamp: expect.any(Number),
          usdPrice: expect.any(Number),
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ])
    )

    expect(ordiTokenPriceHistory).toEqual(
      expect.arrayContaining([
        {
          timestamp: expect.any(Number),
          usdPrice: expect.any(Number),
          token: ordiToken,
        },
      ])
    )

    expect(satsTokenPriceHistory).toEqual(
      expect.arrayContaining([
        {
          timestamp: expect.any(Number),
          usdPrice: expect.any(Number),
          token: satsToken,
        },
      ])
    )
  })

  it('Should be able to get the token prices (Moralis fallback for the native token)', async () => {
    const getTokenPricesSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(
      DefiLlamaCryptoCompareEDS.prototype,
      'getTokenPrices'
    )

    getTokenPricesSpy.mockResolvedValue([{ token: ordiToken, usdPrice: 1 }])

    exchangeDataService = new DefiLlamaCryptoCompareMoralisEDSBitcoin(new BSBitcoin())

    const firstTokenPrices = await exchangeDataService.getTokenPrices({
      tokens: [BSBitcoinConstants.NATIVE_TOKEN, ordiToken],
    })

    expect(firstTokenPrices).toEqual([
      { usdPrice: expect.any(Number), token: BSBitcoinConstants.NATIVE_TOKEN },
      { usdPrice: expect.any(Number), token: ordiToken },
    ])

    getTokenPricesSpy.mockResolvedValue([])

    const secondTokenPrices = await exchangeDataService.getTokenPrices({
      tokens: [BSBitcoinConstants.NATIVE_TOKEN],
    })

    expect(secondTokenPrices).toEqual([{ usdPrice: expect.any(Number), token: BSBitcoinConstants.NATIVE_TOKEN }])
  })

  it('Should be able to get the BRL currency ratio', async () => {
    const currencyRatio = await exchangeDataService.getCurrencyRatio('BRL')

    expect(currencyRatio).toEqual(expect.any(Number))
  })

  it('Should be able to get the EUR currency ratio', async () => {
    const currencyRatio = await exchangeDataService.getCurrencyRatio('EUR')

    expect(currencyRatio).toEqual(expect.any(Number))
  })

  it('Should be able to get the GBP currency ratio', async () => {
    const currencyRatio = await exchangeDataService.getCurrencyRatio('GBP')

    expect(currencyRatio).toEqual(expect.any(Number))
  })
})
