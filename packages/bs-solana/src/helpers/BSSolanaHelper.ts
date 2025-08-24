import { Network } from '@cityofzion/blockchain-service'
import { BSSolanaConstants, BSSolanaNetworkId } from '../constants/BSSolanaConstants'

export class BSSolanaHelper {
  static isMainnet(network: Network<BSSolanaNetworkId>) {
    return BSSolanaConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static fixBip44Path(bip44Path: string) {
    return bip44Path.replace('m/', '')
  }

  static getBip44Path(path: string, index: number) {
    return this.fixBip44Path(path.replace('?', index.toString()))
  }
}
