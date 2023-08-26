import { Currency } from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { CryptoCompareEDSNeoLegacy } from '../CryptoCompareEDSNeoLegacy'

let cryptoCompareEDSNeoLegacy: CryptoCompareEDSNeoLegacy

describe('FlamingoEDSNeo3', () => {
  beforeAll(() => {
    cryptoCompareEDSNeoLegacy = new CryptoCompareEDSNeoLegacy('mainnet')
  })

  it('Should return a list with prices of tokens using USD', async () => {
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const tokenPriceListInUSD = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('BRL')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeGreaterThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const tokenPriceListInUSD = await cryptoCompareEDSNeoLegacy.getTokenPrices('USD')
    const tokenPriceList = await cryptoCompareEDSNeoLegacy.getTokenPrices('EUR')

    tokenPriceList.forEach((tokenPrice, index) => {
      expect(tokenPrice.amount).toBeLessThan(tokenPriceListInUSD[index].amount)
      expect(tokenPrice).toEqual({
        amount: expect.any(Number),
        symbol: expect.any(String),
      })
    })
  })
})
