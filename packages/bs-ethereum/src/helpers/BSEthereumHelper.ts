import { Network } from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../constants/BSEthereumConstants'
import { BSEthereumTokenHelper } from './BSEthereumTokenHelper'

export class BSEthereumHelper {
  static getNativeAsset(network: Network<BSEthereumNetworkId>) {
    const symbol = this.getNativeSymbol(network)

    return BSEthereumTokenHelper.normalizeToken({ symbol, name: symbol, decimals: 18, hash: '0x' })
  }

  static getNativeSymbol(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
  }

  static getRpcList(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }
}
