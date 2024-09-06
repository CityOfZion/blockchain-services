import {
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { BlockscoutBDSEthereum } from '../blockchain-data/BlockscoutBDSEthereum'

interface BlockscoutTokenPriceResponse {
  exchange_rate: string
}

interface BlockscoutStatsResponse {
  coin_price: string
}

export class BlockscoutEDSEthereum extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSEthereumNetworkId>

  constructor(network: Network) {
    super()
    this.#network = network
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!BlockscoutBDSEthereum.isSupported(this.#network)) {
      throw new Error('Exchange is not supported on this network')
    }

    const client = BlockscoutBDSEthereum.getClient(this.#network)

    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)

    const prices: TokenPricesResponse[] = []

    const promises = params.tokens.map(async token => {
      try {
        if (BSEthereumHelper.normalizeHash(token.hash) !== BSEthereumHelper.normalizeHash(nativeToken.hash)) {
          const { data } = await client.get<BlockscoutTokenPriceResponse>(`/tokens/${token.hash}`)

          const exchangeRateNumber = Number(data.exchange_rate)

          prices.push({
            token,
            usdPrice: isNaN(exchangeRateNumber) ? 0 : exchangeRateNumber,
          })

          return
        }

        const { data } = await client.get<BlockscoutStatsResponse>(`/stats`)

        const coinPriceNumber = Number(data.coin_price)

        prices.push({
          token,
          usdPrice: isNaN(coinPriceNumber) ? 0 : coinPriceNumber,
        })
      } catch {
        prices.push({
          token,
          usdPrice: 0,
        })
      }
    })

    await Promise.allSettled(promises)

    return prices
  }

  getTokenPriceHistory(_params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    throw new Error('Blockscout does not support this feature')
  }
}
