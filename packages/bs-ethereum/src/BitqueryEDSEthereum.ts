import { Currency, ExchangeDataService, NetworkType, TokenPricesResponse } from '@cityofzion/blockchain-service'
import { Client, cacheExchange, fetchExchange, gql } from '@urql/core'
import fetch from 'node-fetch'
import { BITQUERY_API_KEY, BITQUERY_URL } from './constants'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { bitqueryGetPricesQuery } from './graphql'

dayjs.extend(utc)
export class BitqueryEDSEthereum implements ExchangeDataService {
  private readonly client: Client
  private readonly networkType: NetworkType

  constructor(networkType: NetworkType) {
    this.networkType = networkType

    this.client = new Client({
      url: BITQUERY_URL,
      exchanges: [cacheExchange, fetchExchange],
      fetch,
      fetchOptions: {
        headers: {
          'X-API-KEY': BITQUERY_API_KEY,
        },
      },
    })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.networkType !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const twoDaysAgo = dayjs.utc().subtract(2, 'day').startOf('date').toISOString()

    const result = await this.client
      .query(bitqueryGetPricesQuery, { after: twoDaysAgo, network: 'ethereum' })
      .toPromise()
    if (result.error) {
      throw new Error(result.error.message)
    }
    if (!result.data) {
      throw new Error('There is no price data')
    }

    let currencyRatio: number = 1
    if (currency !== 'USD') {
      currencyRatio = await this.getCurrencyRatio(currency)
    }

    const prices = result.data.ethereum.dexTrades.map(
      (trade): TokenPricesResponse => ({
        symbol: trade.baseCurrency.symbol,
        amount: trade.quotePrice * currencyRatio,
      })
    )

    return prices
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const request = await fetch(`https://api.flamingo.finance/fiat/exchange-rate?pair=USD_${currency}`, {
      method: 'GET',
    })
    const data = await request.json()
    return data
  }
}
