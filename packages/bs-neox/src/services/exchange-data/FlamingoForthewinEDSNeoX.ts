import {
  FlamingoForthewinEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId } from '../../types'

export class FlamingoForthewinEDSNeoX extends FlamingoForthewinEDS<TBSNeoXName, TBSNeoXNetworkId> {
  constructor(service: IBSNeoX) {
    super(service)
  }

  async getTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Neo X Mainnet')

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (!gasToken && !neoToken) return []

    return await super.getTokenPrices({
      tokens: tokens.filter(({ symbol }) => symbol === 'GAS' || symbol === 'NEO'),
    })
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams) {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Neo X Mainnet')

    const { symbol } = params.token

    if (symbol !== 'GAS' && symbol !== 'NEO') throw new Error('Invalid token, it should be GAS or NEO')

    return await super.getTokenPriceHistory(params)
  }
}
