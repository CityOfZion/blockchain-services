import {
  FlamingoForthewinEDS,
  type TBSToken,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId } from '../../types'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'

export class FlamingoForthewinEDSNeoX extends FlamingoForthewinEDS<TBSNeoXName, TBSNeoXNetworkId> {
  constructor(service: IBSNeoX) {
    super(service)
  }

  async getTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Neo X Mainnet')

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')
    const xGasToken = tokens.find(({ symbol }) => symbol === 'xGAS')

    if (!gasToken && !neoToken && !xGasToken) return []

    const tokensToFetch: TBSToken[] = []

    if (gasToken || xGasToken) tokensToFetch.push(BSNeoXConstants.NATIVE_ASSET)
    if (neoToken) tokensToFetch.push(neoToken)

    const response = await super.getTokenPrices({ tokens: tokensToFetch })

    const prices: TTokenPricesResponse[] = []

    const gasPrice = response.find(({ token }) => token.symbol === 'GAS')
    const neoPrice = response.find(({ token }) => token.symbol === 'NEO')

    if (gasToken && gasPrice) prices.push(gasPrice)
    if (neoToken && neoPrice) prices.push(neoPrice)
    if (xGasToken && gasPrice) prices.push({ ...gasPrice, token: xGasToken })

    return prices
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams) {
    if (this._service.network.type !== 'mainnet') throw new Error('Exchange is only available on Neo X Mainnet')

    const { token } = params
    const { symbol } = token
    const isGas = symbol === 'GAS'
    const isNeo = symbol === 'NEO'
    const isXGas = symbol === 'xGAS'

    if (!isGas && !isNeo && !isXGas) throw new Error('Invalid token, it should be GAS, NEO or xGAS')

    let response = await super.getTokenPriceHistory(
      isXGas ? { ...params, token: BSNeoXConstants.NATIVE_ASSET } : params
    )

    if (isXGas) {
      response = response.map(history => ({ ...history, token }))
    }

    return response
  }
}
