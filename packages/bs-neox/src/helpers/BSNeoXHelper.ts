import { BSError, TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSNeoXNetworkId } from '../types'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

export class BSNeoXHelper {
  static isMainnetNetwork(network: TBSNetwork<TBSNeoXNetworkId>) {
    return network.id === BSNeoXConstants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }

  static getNeoToken(network: TBSNetwork<TBSNeoXNetworkId>) {
    if (network.type === 'custom') {
      throw new BSError('Invalid network', 'INVALID_NETWORK')
    }

    let hash = '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f'

    if (network.type === 'testnet') {
      hash = '0xab0a26b8d903f36acb4bf9663f8d2de0672433cd'
    }

    return { name: 'NEO', symbol: 'NEO', decimals: 18, hash }
  }
}
