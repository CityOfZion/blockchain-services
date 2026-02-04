import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import type { TBSSolanaNetworkId } from '../types'

export class BSSolanaHelper {
  static isMainnetNetwork(network: TBSNetwork<TBSSolanaNetworkId>) {
    return BSSolanaConstants.MAINNET_NETWORK.id === network.id && network.type === 'mainnet'
  }
}
