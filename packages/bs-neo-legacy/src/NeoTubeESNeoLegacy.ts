import { BuildNftUrlParams, ExplorerService } from '@cityofzion/blockchain-service'
import { AvailableNetworkIds } from './BSNeoLegacyHelper'

export class NeoTubeESNeoLegacy implements ExplorerService {
  static SUPPORTED_NETWORKS: AvailableNetworkIds[] = ['mainnet']

  #networkId: AvailableNetworkIds

  constructor(networkId: AvailableNetworkIds) {
    this.#networkId = networkId
  }

  buildTransactionUrl(hash: string): string {
    if (!NeoTubeESNeoLegacy.SUPPORTED_NETWORKS.includes(this.#networkId)) throw new Error('Unsupported network')
    return `https://neo2.neotube.io/transaction/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (!NeoTubeESNeoLegacy.SUPPORTED_NETWORKS.includes(this.#networkId)) throw new Error('Unsupported network')
    return `https://neo2.neotube.io/asset/${contractHash}/page/1`
  }

  buildNftUrl(_params: BuildNftUrlParams): string {
    throw new Error('DoraESNeoLegacy does not support nft')
  }
}
