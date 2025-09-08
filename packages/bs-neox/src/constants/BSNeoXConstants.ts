import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'
import { TokenServiceEthereum } from '@cityofzion/bs-ethereum'

export type BSNeoXNetworkId = NetworkId<'47763' | '12227332'>

export class BSNeoXConstants {
  static #tokenService = new TokenServiceEthereum()

  static NATIVE_ASSET: Token = this.#tokenService.normalizeToken({
    symbol: 'GAS',
    name: 'GAS',
    decimals: 18,
    hash: '0x',
  })

  static NEO_TOKEN: Token = this.#tokenService.normalizeToken({
    name: 'NEO',
    symbol: 'NEO',
    decimals: 18,
    hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
  })

  static RPC_LIST_BY_NETWORK_ID: Record<BSNeoXNetworkId, string[]> = {
    '47763': ['https://mainnet-1.rpc.banelabs.org', 'https://mainnet-2.rpc.banelabs.org'],
    '12227332': ['https://testnet.rpc.banelabs.org', 'https://neoxt4seed1.ngd.network'],
  }

  static MAINNET_NETWORK_IDS: BSNeoXNetworkId[] = ['47763']
  static TESTNET_NETWORK_IDS: BSNeoXNetworkId[] = ['12227332']
  static ALL_NETWORK_IDS: BSNeoXNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<BSNeoXNetworkId>[] = [
    {
      id: '47763',
      name: 'NeoX Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['47763'][0],
    },
  ]
  static TESTNET_NETWORKS: Network<BSNeoXNetworkId>[] = [
    {
      id: '12227332',
      name: 'NeoX Testnet',
      url: this.RPC_LIST_BY_NETWORK_ID['12227332'][0],
    },
  ]
  static ALL_NETWORK: Network<BSNeoXNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  // If tou change this, make sure to update the tests accordingly
  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]
}
