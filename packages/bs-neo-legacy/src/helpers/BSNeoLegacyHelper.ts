import { TNetwork } from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { TBSNeoLegacyNetworkId } from '../types'

export class BSNeoLegacyHelper {
  static getLegacyNetwork(network: TNetwork<TBSNeoLegacyNetworkId>) {
    const legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }

  static getTokens(network: TNetwork<TBSNeoLegacyNetworkId>) {
    const extraTokens = BSNeoLegacyConstants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    const nativeTokens = BSNeoLegacyConstants.NATIVE_ASSETS

    return nativeTokens.concat(extraTokens)
  }

  static getRpcList(network: TNetwork<TBSNeoLegacyNetworkId>) {
    return BSNeoLegacyConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnetNetwork(network: TNetwork<TBSNeoLegacyNetworkId>) {
    return network.id === BSNeoLegacyConstants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }
}
