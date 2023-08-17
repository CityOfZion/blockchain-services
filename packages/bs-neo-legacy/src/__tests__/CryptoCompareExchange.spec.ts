import { Currency } from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'

let bsNeoLegacy: BSNeoLegacy

describe('CryptoCompare', () => {
  beforeAll(() => {
    bsNeoLegacy = new BSNeoLegacy('neoLegacy', { type: 'mainnet', url: '"https://mainnet1.neo2.coz.io:443' })
  })
  it('Should return a list with prices of tokens using USD', async () => {
    const currency: Currency = 'USD'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    const currency: Currency = 'BRL'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    const currency: Currency = 'EUR'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })
})
