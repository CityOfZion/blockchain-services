import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { FlamingoForthewinEDSNeoX } from '../services/exchange-data/FlamingoForthewinEDSNeoX'
import { BSNeoX } from '../BSNeoX'

let flamingoForthewinEDSNeoX: FlamingoForthewinEDSNeoX

const NEO_TOKEN = {
  hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
  decimals: 18,
  name: 'NEO',
  symbol: 'NEO',
}

const XGAS_TOKEN = {
  hash: '0x9a50C8804dC885F118835cD96d3Ea4D4A5131A01',
  decimals: 18,
  name: 'Extended GAS',
  symbol: 'xGAS',
}

// Skip to avoid API key error
describe.skip('FlamingoForthewinEDSNeox', () => {
  beforeEach(async () => {
    const service = new BSNeoX()

    flamingoForthewinEDSNeoX = new FlamingoForthewinEDSNeoX(service)

    // Wait to avoid rate limit
    await BSUtilsHelper.wait(4000)
  })

  describe.only('getTokenPrices', () => {
    it('Should get GAS, NEO and xGAS token prices and ignore Wrapped GAS token', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({
        tokens: [
          {
            hash: '0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF',
            decimals: 18,
            name: 'Wrapped GAS v10',
            symbol: 'WGAS10',
          },
          BSNeoXConstants.NATIVE_ASSET,
          NEO_TOKEN,
          XGAS_TOKEN,
        ],
      })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: BSNeoXConstants.NATIVE_ASSET,
            usdPrice: expect.any(Number),
          },
          {
            token: NEO_TOKEN,
            usdPrice: expect.any(Number),
          },
          {
            token: XGAS_TOKEN,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get GAS and NEO token prices', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({
        tokens: [BSNeoXConstants.NATIVE_ASSET, NEO_TOKEN],
      })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: BSNeoXConstants.NATIVE_ASSET,
            usdPrice: expect.any(Number),
          },
          {
            token: NEO_TOKEN,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get xGAS and GAS token prices', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({
        tokens: [XGAS_TOKEN, BSNeoXConstants.NATIVE_ASSET],
      })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: XGAS_TOKEN,
            usdPrice: expect.any(Number),
          },
          {
            token: BSNeoXConstants.NATIVE_ASSET,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get xGAS and NEO token prices', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({ tokens: [XGAS_TOKEN, NEO_TOKEN] })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: XGAS_TOKEN,
            usdPrice: expect.any(Number),
          },
          {
            token: NEO_TOKEN,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get GAS token price', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({ tokens: [BSNeoXConstants.NATIVE_ASSET] })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: BSNeoXConstants.NATIVE_ASSET,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get NEO token price', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({ tokens: [NEO_TOKEN] })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: NEO_TOKEN,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })

    it('Should get xGAS token price', async () => {
      const response = await flamingoForthewinEDSNeoX.getTokenPrices({ tokens: [XGAS_TOKEN] })

      expect(response).toEqual(
        expect.arrayContaining([
          {
            token: XGAS_TOKEN,
            usdPrice: expect.any(Number),
          },
        ])
      )
    })
  })

  describe('getTokenPriceHistory', () => {
    it('Should get GAS token price history', async () => {
      const params = { token: BSNeoXConstants.NATIVE_ASSET, limit: 20 }
      const responseHour = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'hour' })

      // Wait to avoid rate limit
      await BSUtilsHelper.wait(4000)

      const responseDay = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'day' })

      const expectedResponse = expect.arrayContaining([
        {
          token: BSNeoXConstants.NATIVE_ASSET,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])

      expect(responseHour).toEqual(expectedResponse)
      expect(responseDay).toEqual(expectedResponse)
    })

    it('Should get NEO token price history', async () => {
      const params = { token: NEO_TOKEN, limit: 20 }
      const responseHour = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'hour' })

      // Wait to avoid rate limit
      await BSUtilsHelper.wait(4000)

      const responseDay = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'day' })

      const expectedResponse = expect.arrayContaining([
        {
          token: NEO_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])

      expect(responseHour).toEqual(expectedResponse)
      expect(responseDay).toEqual(expectedResponse)
    })

    it('Should get xGAS token price history', async () => {
      const params = { token: XGAS_TOKEN, limit: 20 }
      const responseHour = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'hour' })

      // Wait to avoid rate limit
      await BSUtilsHelper.wait(4000)

      const responseDay = await flamingoForthewinEDSNeoX.getTokenPriceHistory({ ...params, type: 'day' })

      const expectedResponse = expect.arrayContaining([
        {
          token: XGAS_TOKEN,
          usdPrice: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ])

      expect(responseHour).toEqual(expectedResponse)
      expect(responseDay).toEqual(expectedResponse)
    })
  })
})
