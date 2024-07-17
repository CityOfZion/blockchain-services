import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  Network,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { BSEthereumNetworkId, BSEthereumHelper } from './BSEthereumHelper'
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
  readonly #network: Network<BSEthereumNetworkId>

  constructor(network: Network<BSEthereumNetworkId>, tokens: Token[]) {
    super(tokens)

    this.#network = network

    this.#client = axios.create({
      baseURL: BitqueryBDSEthereum.MIRROR_URL,
    })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

    const twoDaysAgo = dayjs.utc().subtract(2, 'day').startOf('date').toISOString()

    const mirrorNetwork = BitqueryBDSEthereum.MIRROR_NETWORK_BY_NETWORK_ID[this.#network.id]
    if (!mirrorNetwork) {
      throw new Error('BitqueryEDSEthereum is not available for this network')
    }

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

  async getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    if (BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPriceHistory(params)
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await axios.get(`https://api.flamingo.finance/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
