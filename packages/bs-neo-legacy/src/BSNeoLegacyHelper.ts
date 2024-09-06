import { Network } from '@cityofzion/blockchain-service'
import commonTokens from './assets/tokens/common.json'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from './BsNeoLegacyConstants'

export class BSNeoLegacyHelper {
  static getLegacyNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }

  static getTokens(network: Network<BSNeoLegacyNetworkId>) {
    const extraTokens = BSNeoLegacyConstants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return [...extraTokens, ...commonTokens]
  }

  static getRpcList(network: Network<BSNeoLegacyNetworkId>) {
    return BSNeoLegacyConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSNeoLegacyNetworkId>) {
    return BSNeoLegacyConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
