import {
  BSError,
  DefiLlamaCryptoCompareEDS,
  type IExchangeDataService,
  type TBSToken,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyConstants } from '../../constants/BSNeoLegacyConstants'

export class DefiLlamaCryptoCompareEDSNeoLegacy extends DefiLlamaCryptoCompareEDS implements IExchangeDataService {
  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    super()

    this.#service = service
  }

  protected _getDefiLlamaId(token: TBSToken) {
    if (this.#service.tokenService.predicateByHash(BSNeoLegacyConstants.GAS_ASSET, token)) {
      return 'coingecko:gas'
    }

    if (this.#service.tokenService.predicateByHash(BSNeoLegacyConstants.NEO_ASSET, token)) {
      return 'coingecko:neo'
    }
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    return await super.getTokenPriceHistory(params)
  }
}
