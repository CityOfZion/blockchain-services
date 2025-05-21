import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'

export type BSNeoXNetworkId = NetworkId<'47763' | '12227332'>

export class BSNeoXConstants {
  static NATIVE_ASSET: Token = { symbol: 'GAS', name: 'GAS', decimals: 18, hash: '-' }

  static RPC_LIST_BY_NETWORK_ID: Record<BSNeoXNetworkId, string[]> = {
    '47763': ['https://mainnet-1.rpc.banelabs.org'],
    '12227332': ['https://neoxt4seed1.ngd.network'],
  }

  static MAINNET_NETWORK_IDS: BSNeoXNetworkId[] = ['47763']
  static TESTNET_NETWORK_IDS: BSNeoXNetworkId[] = ['12227332']
  static ALL_NETWORK_IDS: BSNeoXNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORK: Network<BSNeoXNetworkId> = {
    id: '47763',
    name: 'NeoX Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['47763'][0],
  }
  static TESTNET_NETWORK: Network<BSNeoXNetworkId> = {
    id: '12227332',
    name: 'NeoX Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['12227332'][0],
  }

  static ALL_NETWORK: Network<BSNeoXNetworkId>[] = [this.TESTNET_NETWORK, this.MAINNET_NETWORK]

  static DEFAULT_NETWORK = this.MAINNET_NETWORK
}
