import { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { TBSNeoLegacyNetworkId } from '../types'

export class BSNeoLegacyHelper {
  static getLegacyNetwork(network: TBSNetwork<TBSNeoLegacyNetworkId>) {
    const legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }

  static isMainnetNetwork(network: TBSNetwork<TBSNeoLegacyNetworkId>) {
    return network.id === BSNeoLegacyConstants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }
}
