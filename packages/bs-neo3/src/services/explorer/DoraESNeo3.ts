import {
  BuildNftUrlParams,
  BSCommonConstants,
  ExplorerService,
  Network,
  TokenService,
} from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class DoraESNeo3 implements ExplorerService {
  readonly #BASE_URL = BSCommonConstants.DORA_URL
  readonly #network: Network<BSNeo3NetworkId>
  readonly #tokenService: TokenService

  constructor(network: Network<BSNeo3NetworkId>, tokenService: TokenService) {
    this.#network = network
    this.#tokenService = tokenService
  }

  buildTransactionUrl(hash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/transaction/neo3/${this.#network.id}/${this.#tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/contract/neo3/${this.#network.id}/${this.#tokenService.normalizeHash(contractHash)}`
  }

  buildNftUrl({ collectionHash, tokenHash }: BuildNftUrlParams): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/nft/neo3/${this.#network.id}/${collectionHash}/${tokenHash}`
  }

  getAddressTemplateUrl() {
    if (BSNeo3Helper.isCustomNet(this.#network)) return undefined

    return `${this.#BASE_URL}/address/neo3/${this.#network.id}/{address}`
  }

  getTxTemplateUrl() {
    if (BSNeo3Helper.isCustomNet(this.#network)) return undefined

    return `${this.#BASE_URL}/transaction/neo3/${this.#network.id}/{txId}`
  }

  getNftTemplateUrl() {
    if (BSNeo3Helper.isCustomNet(this.#network)) return undefined

    return `${this.#BASE_URL}/nft/neo3/${this.#network.id}/{collectionHash}/{tokenHash}`
  }

  getContractTemplateUrl() {
    if (BSNeo3Helper.isCustomNet(this.#network)) return undefined

    return `${this.#BASE_URL}/contract/neo3/${this.#network.id}/{hash}`
  }
}
