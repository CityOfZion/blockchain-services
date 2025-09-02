import { BuildNftUrlParams, ExplorerService, Network, TokenService } from '@cityofzion/blockchain-service'
import { BSNeoLegacyNetworkId } from '../../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class NeoTubeESNeoLegacy implements ExplorerService {
  readonly #BASE_URL = 'https://neo2.neotube.io'

  readonly #network: Network<BSNeoLegacyNetworkId>
  readonly #tokenService: TokenService

  constructor(network: Network<BSNeoLegacyNetworkId>, tokenService: TokenService) {
    this.#network = network
    this.#tokenService = tokenService
  }

  buildTransactionUrl(hash: string): string {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('NeoTube is only available on mainnet')

    return `${this.#BASE_URL}/transaction/${this.#tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('NeoTube is only available on mainnet')

    return `${this.#BASE_URL}/asset/${this.#tokenService.normalizeHash(contractHash)}/page/1`
  }

  buildNftUrl(_params: BuildNftUrlParams): string {
    throw new Error('NeoTube does not support nft')
  }

  getAddressTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) return undefined

    return `${this.#BASE_URL}/address/{address}`
  }

  getTxTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) return undefined

    return `${this.#BASE_URL}/transaction/{txId}`
  }

  getNftTemplateUrl() {
    return undefined
  }

  getContractTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) return undefined

    return `${this.#BASE_URL}/asset/{hash}/page/1`
  }
}
