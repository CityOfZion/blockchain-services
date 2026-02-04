import {
  BSError,
  CryptoCompareEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../../types'

export class CryptoCompareEDSBitcoin<N extends string> extends CryptoCompareEDS {
  readonly #service: IBSBitcoin<N>

  constructor(service: IBSBitcoin<N>) {
    super()

    this.#service = service
  }

  #validateMainnet() {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    this.#validateMainnet()

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    this.#validateMainnet()

    return await super.getTokenPriceHistory(params)
  }
}
