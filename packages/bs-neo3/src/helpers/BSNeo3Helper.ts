import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import type { TBSNeo3NetworkId } from '../types'

export class BSNeo3Helper {
  static getTokens(network: TBSNetwork<TBSNeo3NetworkId>) {
    const extraTokens = BSNeo3Constants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] || []

    return [...BSNeo3Constants.NATIVE_ASSETS, ...extraTokens]
  }

  static getNdmemeToken(network: TBSNetwork<TBSNeo3NetworkId>) {
    if (network.type !== 'mainnet') {
      return { ...BSNeo3Constants.NDMEME_TOKEN, hash: '-' }
    }

    return BSNeo3Constants.NDMEME_TOKEN
  }
}
