import type { TBSToken } from '@cityofzion/blockchain-service'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import { RpcEDSStellar } from '../services/exchange/RpcEDSStellar'
import { BSStellar } from '../BSStellar'

let rpcEDSSolana: RpcEDSStellar<'test'>

describe('RpcEDSStellar', () => {
  beforeAll(() => {
    const service = new BSStellar('test', BSStellarConstants.MAINNET_NETWORK)
    rpcEDSSolana = new RpcEDSStellar(service)
  })

  it('Should return the XLM price in USD', async () => {
    const tokenPriceList = await rpcEDSSolana.getTokenPrices({
      tokens: [BSStellarConstants.NATIVE_TOKEN],
    })

    expect(tokenPriceList).toHaveLength(1)
    expect(tokenPriceList[0]).toEqual({
      usdPrice: expect.any(Number),
      token: BSStellarConstants.NATIVE_TOKEN,
    })
  })

  it('Should return the AQUA price in USD', async () => {
    const aquaToken: TBSToken = {
      symbol: 'AQUA',
      name: 'AQUA Token',
      decimals: 7,
      hash: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    }

    const tokenPriceList = await rpcEDSSolana.getTokenPrices({
      tokens: [aquaToken],
    })

    expect(tokenPriceList).toHaveLength(1)
    expect(tokenPriceList[0]).toEqual({
      usdPrice: expect.any(Number),
      token: aquaToken,
    })
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await rpcEDSSolana.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await rpcEDSSolana.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await rpcEDSSolana.getTokenPriceHistory({
      token: BSStellarConstants.NATIVE_TOKEN,
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        timestamp: expect.any(Number),
        token: BSStellarConstants.NATIVE_TOKEN,
      })
    })
  })
})
