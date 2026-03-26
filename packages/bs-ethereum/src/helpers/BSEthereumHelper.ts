import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import type { TBSEthereumNetworkId } from '../types'

export class BSEthereumHelper {
  static getNativeAsset(network: TBSNetwork<TBSEthereumNetworkId>) {
    const symbol = BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
    return { symbol, name: symbol, decimals: 18, hash: '-' }
  }
}
