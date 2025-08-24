import { TNetwork } from '@cityofzion/blockchain-service'
import { TBSNeoXNetworkId } from '../types'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

export class BSNeoXHelper {
  static isMainnetNetwork(network: TNetwork<TBSNeoXNetworkId>) {
    return network.id === BSNeoXConstants.MAINNET_NETWORK.id && network.type === 'mainnet'
  }
}
