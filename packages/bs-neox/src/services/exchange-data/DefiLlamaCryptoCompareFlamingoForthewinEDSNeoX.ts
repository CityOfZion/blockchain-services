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
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId } from '../../types'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'

export class DefiLlamaCryptoCompareFlamingoForthewinEDSNeoX
  extends DefiLlamaCryptoCompareFlamingoForthewinEDS<TBSNeoXName, TBSNeoXNetworkId>
  implements IExchangeDataService
{
  constructor(service: IBSNeoX) {
    super(service)
  }

  protected _getDefiLlamaId(token: TBSToken) {
    if (this._service.tokenService.predicateByHash(BSNeoXConstants.NATIVE_ASSET, token)) {
      return 'coingecko:gas'
    }

    if (this._service.tokenService.predicateByHash(BSNeoXHelper.getNeoToken(this._service.network), token)) {
      return 'coingecko:neo'
    }
  }

  async getTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this._service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')
    const xGasToken = tokens.find(({ symbol }) => symbol === 'xGAS')

    if (!gasToken && !neoToken && !xGasToken) return []

    const tokensToFetch: TBSToken[] = []

    if (gasToken || xGasToken) tokensToFetch.push(BSNeoXConstants.NATIVE_ASSET)
    if (neoToken) tokensToFetch.push(neoToken)

    const response = await super.getTokenPrices({ tokens: tokensToFetch })
    const gasTokenPrice = response.find(({ token }) => token.symbol === 'GAS')
    const neoTokenPrice = response.find(({ token }) => token.symbol === 'NEO')
    const tokenPrices: TTokenPricesResponse[] = []

    if (gasToken && gasTokenPrice) tokenPrices.push(gasTokenPrice)
    if (neoToken && neoTokenPrice) tokenPrices.push(neoTokenPrice)
    if (xGasToken && gasTokenPrice) tokenPrices.push({ ...gasTokenPrice, token: xGasToken })

    return tokenPrices
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this._service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    const { token } = params
    const { symbol } = token
    const isGas = symbol === 'GAS'
    const isNeo = symbol === 'NEO'
    const isXGas = symbol === 'xGAS'

    if (!isGas && !isNeo && !isXGas) throw new BSError('Invalid token, it should be GAS, NEO or xGAS', 'INVALID_TOKEN')

    let response = await super.getTokenPriceHistory(
      isXGas ? { ...params, token: BSNeoXConstants.NATIVE_ASSET } : params
    )

    if (isXGas) {
      response = response.map(history => ({ ...history, token }))
    }

    return response
  }
}
