import {
  FlamingoForthewinEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeo3, TBSNeo3Name, TBSNeo3NetworkId } from '../../types'

export class FlamingoForthewinEDSNeo3 extends FlamingoForthewinEDS<TBSNeo3Name, TBSNeo3NetworkId> {
  constructor(service: IBSNeo3) {
    super(service)
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPriceHistory(params)
  }
}
