import { Currency } from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'

let bsNeoLegacy: BSNeoLegacy

describe('CryptoCompare', () => {
  beforeEach(() => {
    bsNeoLegacy = new BSNeoLegacy('neoLegacy', { type: 'testnet', url: 'http://seed5.ngd.network:20332' })
  })
  it('Should return a list with prices of tokens using USD', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'USD'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'BRL'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'EUR'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })
})
