import {
  DefiLlamaCryptoCompareEDS,
  type TBSToken,
  type TGetTokenPricesParams,
  type TTokenPricesResponse,
  BSError,
  BSBigNumber,
  type TGetTokenPriceHistoryParams,
  type TTokenPricesHistoryResponse,
  type IExchangeDataService,
} from '@cityofzion/blockchain-service'
import * as stellarSDK from '@stellar/stellar-sdk'
import type { IBSStellar } from '../../types'

export class DefiLlamaCryptoCompareRpcEDSStellar extends DefiLlamaCryptoCompareEDS implements IExchangeDataService {
  #service: IBSStellar

  constructor(service: IBSStellar) {
    super()

    this.#service = service
  }

  protected _getDefiLlamaId({ hash, symbol }: TBSToken) {
    if (this.#service.tokenService.isNativeToken(hash)) {
      return `coingecko:${this.#service.name}`
    }

    return `${this.#service.name}:${symbol.toUpperCase()}-${hash}`
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    let response: TTokenPricesResponse[] = []

    try {
      response = await super.getTokenPrices(params)
    } catch {
      /* empty */
    }

    const symbols = new Set(response.filter(({ usdPrice }) => usdPrice > 0).map(({ token }) => token.symbol))
    const missingTokens = params.tokens.filter(token => !symbols.has(token.symbol))

    if (missingTokens.length === 0) return response

    const usdcIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'

    for (const token of missingTokens) {
      const isUSDC = this.#service.tokenService.predicateByHash(token, usdcIssuer)

      if (isUSDC) {
        response.push({ token, usdPrice: BSBigNumber.ensureNumber(1) })

        continue
      }

      const isNativeToken = this.#service.tokenService.isNativeToken(token.hash)
      let selling: stellarSDK.Asset

      if (isNativeToken) {
        selling = stellarSDK.Asset.native() // XLM
      } else {
        selling = new stellarSDK.Asset(token.symbol, token.hash)
      }

      const buying = new stellarSDK.Asset('USDC', usdcIssuer)
      const orderbook = await this.#service._horizonServer.orderbook(selling, buying).call()
      const bestBid = orderbook.bids[0]?.price

      if (!bestBid) continue

      response.push({ token, usdPrice: BSBigNumber.ensureNumber(bestBid) })
    }

    return response
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    return await super.getTokenPriceHistory(params)
  }
}
