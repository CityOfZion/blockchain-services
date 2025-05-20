import { GetTokenPricesParams } from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { FlamingoForthewinEDSNeoX } from '../services/exchange-data/FlamingoForthewinEDSNeoX'

describe('FlamingoForthewinEDSNeox', () => {
  it('Should get token prices', async () => {
    const params: GetTokenPricesParams = {
      tokens: [
        {
          hash: '0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF',
          decimals: 18,
          name: 'Wrapped GAS v10',
          symbol: 'WGAS10',
        },
        {
          hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
          decimals: 18,
          name: 'NEO',
          symbol: 'NEO',
        },
        {
          hash: '-',
          decimals: 18,
          name: 'GAS',
          symbol: 'GAS',
        },
      ],
    }

    const response = await new FlamingoForthewinEDSNeoX(BSNeoXConstants.MAINNET_NETWORK).getTokenPrices(params)

    expect(response).toEqual(
      expect.arrayContaining([
        {
          token: {
            hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
            decimals: 18,
            name: 'NEO',
            symbol: 'NEO',
          },
          usdPrice: expect.any(Number),
        },
        {
          token: {
            hash: '-',
            decimals: 18,
            name: 'GAS',
            symbol: 'GAS',
          },
          usdPrice: expect.any(Number),
        },
      ])
    )
  })
})
