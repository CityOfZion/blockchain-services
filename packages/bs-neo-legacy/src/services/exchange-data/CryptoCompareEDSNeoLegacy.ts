import {
  CryptoCompareEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class CryptoCompareEDSNeoLegacy<N extends string> extends CryptoCompareEDS {
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    super()

    this.#service = service
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPriceHistory(params)
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPrices(params)
  }
}
