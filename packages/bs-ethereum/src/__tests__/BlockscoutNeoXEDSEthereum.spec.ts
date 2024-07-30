import { GetTokenPricesParams } from '@cityofzion/blockchain-service'
import { BlockscoutNeoXEDSEthereum } from '../BlockscoutNeoXEDSEthereum'
import { BSEthereumHelper } from '../BSEthereumHelper'

const network = BSEthereumHelper.MAINNET_NETWORKS.find(network => network.id === '47763')!

describe('BlockscoutNeoXEDSEthereum', () => {
  it('Should return token prices', async () => {
    const params: GetTokenPricesParams = {
      tokens: [
        {
          hash: '0x8095581030409afc716d5f35Ce5172e13d7bA316',
          decimals: 18,
          name: 'Wrapped GAS v10',
          symbol: 'WGAS10',
        },
        {
          hash: '-',
          decimals: 18,
          name: 'GAS',
          symbol: 'GAS',
        },
      ],
    }

    const response = await new BlockscoutNeoXEDSEthereum(network).getTokenPrices(params)

    expect(response).toEqual([
      {
        token: {
          hash: '-',
          decimals: 18,
          name: 'GAS',
          symbol: 'GAS',
        },
        usdPrice: 0,
      },
      {
        token: {
          hash: '0x8095581030409afc716d5f35Ce5172e13d7bA316',
          decimals: 18,
          name: 'Wrapped GAS v10',
          symbol: 'WGAS10',
        },
        usdPrice: 0,
      },
    ])
  })
})
