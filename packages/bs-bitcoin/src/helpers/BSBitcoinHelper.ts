import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import type { TBSBitcoinNetworkId } from '../types'

export class BSBitcoinHelper {
  static isMainnetNetwork(network: TBSNetwork<TBSBitcoinNetworkId>) {
    return network.type === 'mainnet' && BSBitcoinConstants.MAINNET_NETWORK.id === network.id
  }

  static isTestnetNetwork(network: TBSNetwork<TBSBitcoinNetworkId>) {
    return network.type === 'testnet' && BSBitcoinConstants.TESTNET_NETWORK.id === network.id
  }
}
