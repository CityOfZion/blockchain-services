import {
  FlamingoForthewinEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeo3 } from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class FlamingoForthewinEDSNeo3<N extends string> extends FlamingoForthewinEDS<N> {
  constructor(service: IBSNeo3<N>) {
    super(service)
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPriceHistory(params)
  }
}
