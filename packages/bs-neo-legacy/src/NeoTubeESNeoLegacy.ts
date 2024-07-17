import { BuildNftUrlParams, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSNeoLegacyNetworkId, BSNeoLegacyHelper } from './BSNeoLegacyHelper'

export class NeoTubeESNeoLegacy implements ExplorerService {
  #network: Network<BSNeoLegacyNetworkId>

  constructor(network: Network<BSNeoLegacyNetworkId>) {
    this.#network = network
  }

  buildTransactionUrl(hash: string): string {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('NeoTube is only available on mainnet')
    return `https://neo2.neotube.io/transaction/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('NeoTube is only available on mainnet')
    return `https://neo2.neotube.io/asset/${contractHash}/page/1`
  }

  buildNftUrl(_params: BuildNftUrlParams): string {
    throw new Error('NeoTube does not support nft')
  }
}
