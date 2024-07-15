import { ExplorerService, BuildNftUrlParams } from '@cityofzion/blockchain-service'
import { AvailableNetworkIds } from './BSNeo3Helper'
import { DoraBDSNeo3 } from './DoraBDSNeo3'

export class DoraESNeo3 implements ExplorerService {
  readonly #networkId: AvailableNetworkIds

  constructor(networkType: AvailableNetworkIds) {
    this.#networkId = networkType
  }

  buildTransactionUrl(hash: string): string {
    if (!DoraBDSNeo3.SUPPORTED_NETWORKS.includes(this.#networkId)) throw new Error('Unsupported network')
    return `https://dora.coz.io/transaction/neo3/${this.#networkId}/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (!DoraBDSNeo3.SUPPORTED_NETWORKS.includes(this.#networkId)) throw new Error('Unsupported network')
    return `https://dora.coz.io/contract/neo3/${this.#networkId}/${contractHash}`
  }

  buildNftUrl({ contractHash, tokenId }: BuildNftUrlParams): string {
    if (!DoraBDSNeo3.SUPPORTED_NETWORKS.includes(this.#networkId)) throw new Error('Unsupported network')
    return `https://dora.coz.io/nft/neo3/${this.#networkId}/${contractHash}/${tokenId}`
  }
}
