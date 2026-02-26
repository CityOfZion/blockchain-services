import type { TBSNetwork, TBSNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import type { IBSEthereum, TBSEthereumNetworkId } from '../types'

export class BSEthereumHelper {
  static getNativeAsset(network: TBSNetwork<TBSEthereumNetworkId>) {
    const symbol = BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
    return { symbol, name: symbol, decimals: 18, hash: '0x' }
  }

  static isMainnetNetwork<N extends string, A extends TBSNetworkId>(service: IBSEthereum<N, A>) {
    return (
      service.network.type === 'mainnet' && service.availableNetworks.some(network => network.id === service.network.id)
    )
  }
}
