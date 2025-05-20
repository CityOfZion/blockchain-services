import {
  ExchangeDataService,
  FlamingoForthewinEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants, BSNeoXNetworkId } from '../../constants/BSNeoXConstants'

export class FlamingoForthewinEDSNeoX extends FlamingoForthewinEDS implements ExchangeDataService {
  readonly #network: Network<BSNeoXNetworkId>

  constructor(network: Network<BSNeoXNetworkId>) {
    super()

    this.#network = network
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    this.#validate()

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (!gasToken && !neoToken) return []

    return await super.getTokenPrices({
      tokens: tokens.filter(({ symbol }) => symbol === 'GAS' || symbol === 'NEO'),
    })
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams) {
    this.#validate()

    const { symbol } = params.token

    if (symbol !== 'GAS' && symbol !== 'NEO') throw new Error('Invalid token, it should be GAS or NEO')

    return await super.getTokenPriceHistory(params)
  }

  async #validate() {
    if (!BSNeoXConstants.MAINNET_NETWORK_IDS.includes(this.#network.id))
      throw new Error('Exchange is only available on Neo X Mainnet')
  }
}
