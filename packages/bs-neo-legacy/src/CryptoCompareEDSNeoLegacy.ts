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
import { BSNeoLegacyNetworkId, BSNeoLegacyHelper } from './BSNeoLegacyHelper'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS implements ExchangeDataService {
  #network: Network<BSNeoLegacyNetworkId>

  constructor(network: Network<BSNeoLegacyNetworkId>, tokens: Token[]) {
    super(tokens)
    this.#network = network
  }

  async getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPrices(currency)
  }
}
