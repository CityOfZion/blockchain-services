import {
  BSBigNumberHelper,
  CryptoCompareEDS,
  type TGetTokenPricesParams,
  type TTokenPricesResponse,
  BSError,
} from '@cityofzion/blockchain-service'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'
import type { IBSStellar } from '../../types'

export class RpcEDSStellar<N extends string> extends CryptoCompareEDS {
  #service: IBSStellar<N>

  constructor(service: IBSStellar<N>) {
    super()
    this.#service = service
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet')
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')

    const buying = new stellarSDK.Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN')

    const tokenPrices: TTokenPricesResponse[] = []

    for (const token of params.tokens) {
      let selling: stellarSDK.Asset

      const isNativeToken = this.#service.tokenService.predicateByHash(token, BSStellarConstants.NATIVE_TOKEN)

      if (isNativeToken) {
        selling = stellarSDK.Asset.native() // XLM
      } else {
        selling = new stellarSDK.Asset(token.symbol, token.hash)
      }

      const orderbook = await this.#service.horizonServer.orderbook(selling, buying).call()

      const bestBid = orderbook.bids[0]?.price
      if (!bestBid) continue

      tokenPrices.push({
        token,
        usdPrice: BSBigNumberHelper.fromNumber(bestBid).toNumber(),
      })
    }

    return tokenPrices
  }
}
