import {
  CryptoCompareEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS {
  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    super()

    this.#service = service
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPriceHistory(params)
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    return await super.getTokenPrices(params)
  }
}
