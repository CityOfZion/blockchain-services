import {
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSNeoLegacyHelper } from './BSNeoLegacyHelper'
import { BSNeoLegacyNetworkId } from './BsNeoLegacyConstants'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS implements ExchangeDataService {
  #network: Network<BSNeoLegacyNetworkId>

  constructor(network: Network<BSNeoLegacyNetworkId>) {
    super()

    this.#network = network
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPrices(params)
  }
}
