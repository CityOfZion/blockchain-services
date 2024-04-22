import { Currency, ExchangeDataService, NetworkType, TokenPricesResponse } from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE, BITQUERY_MIRROR_URL } from './constants'

type BitQueryGetTokenPricesResponse = {
  ethereum: {
    dexTrades: {
      baseCurrency: {
        address: string
        symbol: string
      }
      quoteCurrency: {
        address: string
        symbol: string
      }
      date: {
        date: string
      }
      quotePrice: number
    }[]
  }
}

dayjs.extend(utc)
export class BitqueryEDSEthereum implements ExchangeDataService {
  readonly #client: AxiosInstance
  readonly #networkType: NetworkType

  constructor(networkType: NetworkType) {
    this.#networkType = networkType

    this.#client = axios.create({
      baseURL: BITQUERY_MIRROR_URL,
    })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.#networkType !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const twoDaysAgo = dayjs.utc().subtract(2, 'day').startOf('date').toISOString()

    const result = await this.#client.get<BitQueryGetTokenPricesResponse>(`/get-price`, {
      params: { network: BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE[this.#networkType], after: twoDaysAgo },
    })

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
        price: trade.quotePrice * currencyRatio,
        hash: trade.baseCurrency.address,
      })
    )

    return prices
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await axios.get(`https://api.flamingo.finance/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
