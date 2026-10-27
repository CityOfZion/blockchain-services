import {
  BSError,
  BSUtilsHelper,
  DefiLlamaCryptoCompareEDS,
  type IExchangeDataService,
  type TBSToken,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { IBSBitcoin, TMoralisPriceResponse } from '../../types'
import { BSBitcoinMoralisHelper } from '../../helpers/BSBitcoinMoralisHelper'
import { BSBitcoinConstants } from '../../constants/BSBitcoinConstants'

export class DefiLlamaCryptoCompareMoralisEDSBitcoin extends DefiLlamaCryptoCompareEDS implements IExchangeDataService {
  readonly #service: IBSBitcoin
  readonly #moralisApi = BSBitcoinMoralisHelper.getApi()

  constructor(service: IBSBitcoin) {
    super()

    this.#service = service
  }

  protected _getDefiLlamaId({ hash }: TBSToken) {
    if (this.#service.tokenService.isNativeToken(hash)) {
      return `coingecko:${this.#service.name}`
    }

    return `${this.#service.name}:${hash}`
  }

  #validateMainnet() {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    this.#validateMainnet()

    let response: TTokenPricesResponse[] = []

    try {
      response = await super.getTokenPrices(params)
    } catch {
      /* empty */
    }

    const hasParamsWithNativeToken = params.tokens.some(token => this.#service.tokenService.isNativeToken(token.hash))

    const hasResponseWithNativeToken = response.some(
      ({ token, usdPrice }) => this.#service.tokenService.isNativeToken(token.hash) && usdPrice > 0
    )

    if (!hasParamsWithNativeToken || hasResponseWithNativeToken) {
      return response
    }

    const [nativeTokenPriceResponse] = await BSUtilsHelper.tryCatch(() =>
      this.#moralisApi.get<TMoralisPriceResponse>('/chains/bitcoin/tokens/native/price')
    )

    const usdPrice = nativeTokenPriceResponse?.data?.usdPrice

    if (!!usdPrice && usdPrice > 0) {
      response.unshift({ token: BSBitcoinConstants.NATIVE_TOKEN, usdPrice })
    }

    return response
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    this.#validateMainnet()

    return await super.getTokenPriceHistory(params)
  }
}
