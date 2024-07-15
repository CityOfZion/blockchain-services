import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { AvailableNetworkIds } from './BSNeoLegacyHelper'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS implements ExchangeDataService {
  #networkId: AvailableNetworkIds

  constructor(networkId: AvailableNetworkIds, tokens: Token[]) {
    super(tokens)
    this.#networkId = networkId
  }

  getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    if (this.#networkId !== 'mainnet') throw new Error('Exchange is only available on mainnet')
    return super.getTokenPriceHistory(params)
  }

  getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.#networkId !== 'mainnet') throw new Error('Exchange is only available on mainnet')
    return super.getTokenPrices(currency)
  }
}
