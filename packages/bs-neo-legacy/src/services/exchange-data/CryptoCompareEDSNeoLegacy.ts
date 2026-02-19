import {
  CryptoCompareEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class CryptoCompareEDSNeoLegacy<N extends string> extends CryptoCompareEDS {
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    super()

    this.#service = service
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPriceHistory(params)
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPrices(params)
  }
}
