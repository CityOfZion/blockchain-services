import {
  ExchangeDataService,
  FlamingoForthewinEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class FlamingoForthewinEDSNeo3 extends FlamingoForthewinEDS implements ExchangeDataService {
  readonly #network: Network<BSNeo3NetworkId>

  constructor(network: Network<BSNeo3NetworkId>) {
    super()

    this.#network = network
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPrices(params)
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on Mainnet')

    return await super.getTokenPriceHistory(params)
  }
}
