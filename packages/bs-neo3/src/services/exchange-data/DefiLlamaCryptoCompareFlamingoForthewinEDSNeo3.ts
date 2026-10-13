import {
  BSError,
  DefiLlamaCryptoCompareFlamingoForthewinEDS,
  type IExchangeDataService,
  type TBSToken,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeo3, TBSNeo3Name, TBSNeo3NetworkId } from '../../types'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'

export class DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3
  extends DefiLlamaCryptoCompareFlamingoForthewinEDS<TBSNeo3Name, TBSNeo3NetworkId>
  implements IExchangeDataService
{
  constructor(service: IBSNeo3) {
    super(service)
  }

  protected _getDefiLlamaId(token: TBSToken) {
    if (this._service.tokenService.predicateByHash(BSNeo3Constants.GAS_TOKEN, token)) {
      return 'coingecko:gas'
    }

    if (this._service.tokenService.predicateByHash(BSNeo3Constants.NEO_TOKEN, token)) {
      return 'coingecko:neo'
    }
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this._service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this._service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    return await super.getTokenPriceHistory(params)
  }
}
