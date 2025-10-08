import { TNetwork } from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { TBSNeo3NetworkId } from '../types'

export class BSNeo3Helper {
  static getTokens(network: TNetwork<TBSNeo3NetworkId>) {
    const extraTokens = BSNeo3Constants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return [...extraTokens, ...BSNeo3Constants.NATIVE_ASSETS]
  }

  static getRpcList(network: TNetwork<TBSNeo3NetworkId>) {
    return BSNeo3Constants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isCustomNetwork(network: TNetwork<TBSNeo3NetworkId>) {
    if (network.type === 'custom') return true

    const knownNetwork = BSNeo3Constants.ALL_NETWORKS.find(n => n.id === network.id)
    if (!knownNetwork) return true

    return false
  }

  static isMainnetNetwork(network: TNetwork<TBSNeo3NetworkId>) {
    return network.id === BSNeo3Constants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }
}
