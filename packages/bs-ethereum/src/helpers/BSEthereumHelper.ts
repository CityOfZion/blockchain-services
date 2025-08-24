import { Network } from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../constants/BSEthereumConstants'
import { TokenServiceEthereum } from '../services/token/TokenServiceEthereum'

export class BSEthereumHelper {
  static tokenService = new TokenServiceEthereum()

  static getNativeAsset(network: Network<BSEthereumNetworkId>) {
    const symbol = BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
    return { symbol, name: symbol, decimals: 18, hash: this.tokenService.normalizeHash('0x') }
  }

  static getRpcList(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }
}
