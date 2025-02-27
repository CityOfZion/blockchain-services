import { BuildNftUrlParams, BSCommonConstants, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class DoraESNeo3 implements ExplorerService {
  readonly #BASE_URL = BSCommonConstants.DORA_URL
  readonly #network: Network<BSNeo3NetworkId>

  constructor(network: Network<BSNeo3NetworkId>) {
    this.#network = network
  }

  buildTransactionUrl(hash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/transaction/neo3/${this.#network.id}/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/contract/neo3/${this.#network.id}/${contractHash}`
  }

  buildNftUrl({ contractHash, tokenId }: BuildNftUrlParams): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${this.#BASE_URL}/nft/neo3/${this.#network.id}/${contractHash}/${tokenId}`
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

    return `${this.#BASE_URL}/nft/neo3/${this.#network.id}/{hash}/{tokenId}`
  }

  getContractTemplateUrl() {
    if (BSNeo3Helper.isCustomNet(this.#network)) return undefined

    return `${this.#BASE_URL}/contract/neo3/${this.#network.id}/{hash}`
  }
}
