import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  Network,
  Token,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { AvailableNetworkIds } from './BSEthereumHelper'
import { BitqueryBDSEthereum } from './BitqueryBDSEthereum'

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
export class BitqueryEDSEthereum extends CryptoCompareEDS implements ExchangeDataService {
  readonly #client: AxiosInstance
  readonly #network: Network<AvailableNetworkIds>

  constructor(network: Network<AvailableNetworkIds>, tokens: Token[]) {
    super(tokens)

    this.#network = network

    this.#client = axios.create({
      baseURL: BitqueryBDSEthereum.MIRROR_URL,
    })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    const twoDaysAgo = dayjs.utc().subtract(2, 'day').startOf('date').toISOString()

    const mirrorNetwork = BitqueryBDSEthereum.getMirrorNetworkId(this.#network)

    const result = await this.#client.get<BitQueryGetTokenPricesResponse>(`/get-price`, {
      params: { network: mirrorNetwork, after: twoDaysAgo },
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
