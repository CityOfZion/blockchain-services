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
    decimals: 8,
    hasExtraId: false,
    validationExtra: null,
    validationAddress: '^(N)[A-Za-z0-9]{33}$',
    addressTemplateUrl: 'https://dora.coz.io/address/neo3/mainnet/{address}',
    txTemplateUrl: 'https://dora.coz.io/transaction/neo3/mainnet/{txId}',
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
    hasExtraId: false,
    validationExtra: null,
    validationAddress: '^(N)[A-Za-z0-9]{33}$',
    addressTemplateUrl: 'https://dora.coz.io/address/neo3/mainnet/{address}',
    txTemplateUrl: 'https://dora.coz.io/transaction/neo3/mainnet/{txId}',
    blockchain: 'neo3',
  }

  const xrpCurrency: SimpleSwapApiCurrency = {
    id: 'xrp:xrp',
    ticker: 'xrp',
    symbol: 'XRP',
    network: 'xrp',
    name: 'XRP',
    imageUrl: 'https://static.simpleswap.io/images/currencies-logo/xrp.svg',
    hasExtraId: true,
    validationExtra: '^r[1-9A-HJ-NP-Za-km-z]{25,34}$',
    validationAddress: '^((?!0)[0-9]{1,10})$',
    addressTemplateUrl: 'https://xrpscan.com/account/{address}',
    txTemplateUrl: 'https://xrpscan.com/tx/{txId}',
  }

  const notcoinCurrency: SimpleSwapApiCurrency = {
    id: 'not:ton',
    ticker: 'not',
    symbol: 'NOT',
    network: 'ton',
    name: 'Notcoin',
    imageUrl: 'https://static.simpleswap.io/images/currencies-logo/not.svg',
    hash: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
    hasExtraId: true,
    validationExtra: '^[0-9A-Za-z\\-_]{1,120}$',
    validationAddress: '^[UE][Qf][0-9a-z-A-Z\\-\\_]{46}$',
    addressTemplateUrl: 'https://tonscan.org/address/{address}',
    txTemplateUrl: 'https://tonscan.org/tx/{txId}',
  }

  it.skip('Should create the exchange with params', async () => {
    const address = process.env.TEST_ADDRESS_TO_SWAP_TOKEN
    const result = await simpleSwapApi.createExchange({
      currencyFrom: gasCurrency,
      currencyTo: neoCurrency,
      amount: '89',
      refundAddress: address,
      address,
      extraIdToReceive: null,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        depositAddress: expect.any(String),
        log: expect.any(String),
      })
    )
  }, 10000)

  it.skip('Should create the exchange to XRP with extraIdToReceive', async () => {
    const addressFrom = process.env.TEST_ADDRESS_TO_SWAP_TOKEN
    const addressTo = process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN
    const extraIdToReceive = process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN
    const result = await simpleSwapApi.createExchange({
      currencyFrom: gasCurrency,
      currencyTo: xrpCurrency,
      amount: '89',
      refundAddress: addressFrom,
      address: addressTo,
      extraIdToReceive,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        depositAddress: expect.any(String),
        log: expect.any(String),
      })
    )
  }, 10000)

  it.skip('Should create the exchange to Notcoin with extraIdToReceive', async () => {
    const addressFrom = process.env.TEST_ADDRESS_TO_SWAP_TOKEN
    const addressTo = process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN
    const extraIdToReceive = process.env.TEST_NOTCOIN_EXTRA_ID_TO_SWAP_TOKEN
    const result = await simpleSwapApi.createExchange({
      currencyFrom: gasCurrency,
      currencyTo: notcoinCurrency,
      amount: '89',
      refundAddress: addressFrom,
      address: addressTo,
      extraIdToReceive,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        depositAddress: expect.any(String),
        log: expect.any(String),
      })
    )
  }, 10000)

  it('Should get the exchange by swap id', async () => {
    const result = await simpleSwapApi.getExchange(process.env.TEST_SWAP_ID)

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
