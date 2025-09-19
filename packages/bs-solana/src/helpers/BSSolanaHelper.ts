import { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { TBSSolanaNetworkId } from '../types'

export class BSSolanaHelper {
  static fixBip44Path(bip44Path: string) {
    return bip44Path.replace('m/', '')
  }

  static getBip44Path(path: string, index: number) {
    return this.fixBip44Path(path.replace('?', index.toString()))
  }

  static isMainnetNetwork(network: TBSNetwork<TBSSolanaNetworkId>) {
    return BSSolanaConstants.MAINNET_NETWORK.id === network.id && network.type === 'mainnet'
  }
}
