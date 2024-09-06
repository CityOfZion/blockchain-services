import { Network } from '@cityofzion/blockchain-service'
import commonTokens from '../assets/tokens/common.json'
import { BSNeo3Constants, BSNeo3NetworkId } from '../constants/BSNeo3Constants'

export class BSNeo3Helper {
  static getTokens(network: Network<BSNeo3NetworkId>) {
    const extraTokens = BSNeo3Constants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return [...extraTokens, ...commonTokens]
  }

  static getRpcList(network: Network<BSNeo3NetworkId>) {
    return BSNeo3Constants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSNeo3NetworkId>) {
    return BSNeo3Constants.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static isCustomNet(network: Network<BSNeo3NetworkId>) {
    return !BSNeo3Constants.ALL_NETWORK_IDS.includes(network.id)
  }

  static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
