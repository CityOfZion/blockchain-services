import { SimpleSwapApi } from '../apis/SimpleSwapApi'
import { SimpleSwapApiCurrency } from '../types/simpleSwap'

describe('SimpleSwapApi', () => {
  const simpleSwapApi = new SimpleSwapApi()

  const gasCurrency: SimpleSwapApiCurrency<'neo3'> = {
    id: 'gasn3:neo3',
    ticker: 'gasn3',
    symbol: 'gasn3',
    network: 'neo3',
    name: 'Gas',
    imageUrl: 'https://static.simpleswap.io/images/currencies-logo/gasn3.svg',
    hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
    decimals: undefined,
    validationAddress: '^(N)[A-Za-z0-9]{33}$',
    blockchain: 'neo3',
  }

  const neoCurrency: SimpleSwapApiCurrency<'neo3'> = {
    id: 'neo3:neo3',
    ticker: 'neo3',
    symbol: 'NEO',
    network: 'neo3',
    name: 'NEO',
    imageUrl: 'https://static.simpleswap.io/images/currencies-logo/neo3.svg',
    hash: 'ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
    decimals: 0,
    validationAddress: '^(N)[A-Za-z0-9]{33}$',
    blockchain: 'neo3',
  }

  it.skip('Should create the exchange with params', async () => {
    const address = process.env.TEST_ADDRESS_TO_SWAP_TOKEN as string
    const result = await simpleSwapApi.createExchange(gasCurrency, neoCurrency, '1000', address, address)

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        depositAddress: expect.any(String),
        log: expect.any(String),
      })
    )
  })

  it('Should get the exchange by swap id', async () => {
    const result = await simpleSwapApi.getExchange(process.env.TEST_SWAP_ID as string)

    expect(result).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        txFrom: null,
        txTo: null,
        log: expect.any(String),
      })
    )
  }, 10000)
})
