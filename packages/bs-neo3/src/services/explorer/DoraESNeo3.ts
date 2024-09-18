import { BuildNftUrlParams, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class DoraESNeo3 implements ExplorerService {
  readonly #network: Network<BSNeo3NetworkId>

  constructor(network: Network<BSNeo3NetworkId>) {
    this.#network = network
  }

  buildTransactionUrl(hash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')
    return `https://dora.coz.io/transaction/neo3/${this.#network.id}/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')
    return `https://dora.coz.io/contract/neo3/${this.#network.id}/${contractHash}`
  }

  buildNftUrl({ contractHash, tokenId }: BuildNftUrlParams): string {
    if (BSNeo3Helper.isCustomNet(this.#network)) throw new Error('DoraESNeo3 is only available on mainnet and testnet')
    return `https://dora.coz.io/nft/neo3/${this.#network.id}/${contractHash}/${tokenId}`
  }
}
