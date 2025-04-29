import {
  ExchangeDataService,
  FlamingoForthewinEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { BlockscoutBDSEthereum } from '../blockchain-data/BlockscoutBDSEthereum'

export class FlamingoForthewinEDSNeox extends FlamingoForthewinEDS implements ExchangeDataService {
  readonly #network: Network<BSEthereumNetworkId>

  constructor(network: Network) {
    super()

    this.#network = network
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    this.#validateNeoXMainnetNetwork()

    const gasToken = tokens.find(({ symbol }) => symbol === 'GAS')
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (!gasToken && !neoToken) return []

    return await super.getTokenPrices({
      tokens: tokens.filter(({ symbol }) => symbol === 'GAS' || symbol === 'NEO'),
    })
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams) {
    this.#validateNeoXMainnetNetwork()

    const { symbol } = params.token

    if (symbol !== 'GAS' && symbol !== 'NEO') throw new Error('Invalid token, it should be GAS or NEO')

    return await super.getTokenPriceHistory(params)
  }

  #validateNeoXMainnetNetwork() {
    if (!BlockscoutBDSEthereum.isNeoX(this.#network) || !BSEthereumHelper.isMainnet(this.#network))
      throw new Error('Exchange is only available on Neo X Mainnet')
  }
}
