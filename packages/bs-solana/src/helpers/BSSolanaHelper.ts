import { Network } from '@cityofzion/blockchain-service'
import { BSSolanaConstants, BSSolanaNetworkId } from '../constants/BSSolanaConstants'

export class BSSolanaHelper {
  static isMainnet(network: Network<BSSolanaNetworkId>) {
    return BSSolanaConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }
}
