import { TNetwork, TNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { IBSEthereum, TBSEthereumNetworkId } from '../types'

export class BSEthereumHelper {
  static getNativeAsset(network: TNetwork<TBSEthereumNetworkId>) {
    const symbol = BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
    return { symbol, name: symbol, decimals: 18, hash: '0x' }
  }

  static getRpcList(network: TNetwork<TBSEthereumNetworkId>) {
    return BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnetNetwork<N extends string, A extends TNetworkId>(service: IBSEthereum<N, A>) {
    return (
      service.network.type === 'mainnet' && service.availableNetworks.some(network => network.id === service.network.id)
    )
  }
}
