import {
  FlamingoForthewinEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { IBSNeoX } from '../../types'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'

export class FlamingoForthewinEDSNeoX<N extends string> extends FlamingoForthewinEDS<N> {
  constructor(service: IBSNeoX<N>) {
    super(service)
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeoXHelper.isMainnetNetwork(this._service.network))
      throw new Error('Exchange is only available on Neo X Mainnet')

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (!gasToken && !neoToken) return []

    return await super.getTokenPrices({
      tokens: tokens.filter(({ symbol }) => symbol === 'GAS' || symbol === 'NEO'),
    })
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams) {
    if (!BSNeoXHelper.isMainnetNetwork(this._service.network))
      throw new Error('Exchange is only available on Neo X Mainnet')

    const { symbol } = params.token

    if (symbol !== 'GAS' && symbol !== 'NEO') throw new Error('Invalid token, it should be GAS or NEO')

    return await super.getTokenPriceHistory(params)
  }
}
