import { BSError, TBSNetwork } from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import type { TBSNeoXNetworkId } from '../types'

export class BSNeoXHelper {
  static getNeoToken(network: TBSNetwork<TBSNeoXNetworkId>) {
    const isMainnet = network.type === 'mainnet'

    if (!isMainnet && network.type !== 'testnet') {
      throw new BSError('Invalid network', 'INVALID_NETWORK')
    }

    const symbol = 'NEO'

    return {
      name: symbol,
      symbol,
      hash: isMainnet ? '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f' : '0xab0a26b8d903f36acb4bf9663f8d2de0672433cd',
      decimals: 18,
    }
  }

  static getNdmemeToken(network: TBSNetwork<TBSNeoXNetworkId>) {
    if (network.type !== 'mainnet') {
      return { ...BSNeoXConstants.NDMEME_TOKEN, hash: '-' }
    }

    return BSNeoXConstants.NDMEME_TOKEN
  }
}
