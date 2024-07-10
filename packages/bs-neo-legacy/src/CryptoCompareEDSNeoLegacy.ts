import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { AvailableNetworkIds, TOKENS } from './constants'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS implements ExchangeDataService {
  #networkId: AvailableNetworkIds

  constructor(networkId: AvailableNetworkIds) {
    super(TOKENS[networkId])
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
