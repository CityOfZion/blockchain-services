import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import type { TBSNeoLegacyNetworkId } from '../types'

export class BSNeoLegacyHelper {
  static getLegacyNetwork(network: TBSNetwork<TBSNeoLegacyNetworkId>) {
    const legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }
}
