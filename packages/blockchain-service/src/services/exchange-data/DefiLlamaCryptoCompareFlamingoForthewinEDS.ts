import type {
  TGetTokenPricesParams,
  IBlockchainService,
  IExchangeDataService,
  TTokenPricesResponse,
  TBSNetworkId,
} from '../../interfaces'
import axios, { AxiosInstance } from 'axios'
import { DefiLlamaCryptoCompareEDS } from './DefiLlamaCryptoCompareEDS'
import type { TFlamingoPricesResponse, TForthewinPricesResponse } from '../../types'

export class DefiLlamaCryptoCompareFlamingoForthewinEDS<N extends string, A extends TBSNetworkId>
  extends DefiLlamaCryptoCompareEDS
  implements IExchangeDataService
{
  #flamingoApiInstance?: AxiosInstance
  #forthewinApiInstance?: AxiosInstance

  readonly _service: IBlockchainService<N, A>

  constructor(service: IBlockchainService<N, A>) {
    super()

    this._service = service
  }

  get #flamingoApi() {
    if (!this.#flamingoApiInstance) {
      this.#flamingoApiInstance = axios.create({ baseURL: 'https://neo-api.b-cdn.net/flamingo' })
    }

    return this.#flamingoApiInstance
  }

  get #forthewinApi() {
    if (!this.#forthewinApiInstance) {
      this.#forthewinApiInstance = axios.create({ baseURL: 'https://api.forthewin.network' })
    }

    return this.#forthewinApiInstance
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    let response: TTokenPricesResponse[] = []

    try {
      response = await super.getTokenPrices(params)
    } catch {
      /* empty */
    }

    const symbols = new Set(response.filter(({ usdPrice }) => usdPrice > 0).map(({ token }) => token.symbol))
    const missingTokens = params.tokens.filter(token => !symbols.has(token.symbol))

    if (missingTokens.length === 0) return response

    const { data: flamingoData } = await this.#flamingoApi.get<TFlamingoPricesResponse>('/live-data/prices/latest')
    const missingResponse: TTokenPricesResponse[] = []
    const neoToken = missingTokens.find(({ symbol }) => symbol === 'NEO')

    if (neoToken && !flamingoData.find(token => this._service.tokenService.predicate(neoToken, token))) {
      flamingoData.forEach(item => {
        if (item.symbol === 'bNEO') flamingoData.push({ ...item, symbol: neoToken.symbol, hash: neoToken.hash })
      })
    }

    flamingoData.forEach(item => {
      const token = missingTokens.find(token => this._service.tokenService.predicate(item, token))

      if (!token) return

      missingResponse.push({ usdPrice: item.usd_price, token })
    })

    if (missingTokens.length > missingResponse.length) {
      const { data: forthewinData } = await this.#forthewinApi.get<TForthewinPricesResponse>('/mainnet/prices')

      Object.entries(forthewinData).forEach(([hash, usdPrice]) => {
        const hasPrice = !!missingResponse.find(({ token }) => this._service.tokenService.predicate({ hash }, token))

        if (hasPrice) return

        const foundToken = missingTokens.find(token => this._service.tokenService.predicate({ hash }, token))

        if (!foundToken) return

        missingResponse.push({ usdPrice, token: foundToken })
      })
    }

    return [...response, ...missingResponse]
  }
}
