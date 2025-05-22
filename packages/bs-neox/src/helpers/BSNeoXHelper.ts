import { Network } from '@cityofzion/blockchain-service'
import { BSNeoXConstants, BSNeoXNetworkId } from '../constants/BSNeoXConstants'

export class BSNeoXHelper {
  static isMainnet(network: Network<BSNeoXNetworkId>) {
    return BSNeoXConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }
}
