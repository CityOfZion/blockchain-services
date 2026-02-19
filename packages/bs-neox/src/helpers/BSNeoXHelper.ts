import type { TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSNeoXNetworkId } from '../types'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

export class BSNeoXHelper {
  static isMainnetNetwork(network: TBSNetwork<TBSNeoXNetworkId>) {
    return network.id === BSNeoXConstants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }
}
