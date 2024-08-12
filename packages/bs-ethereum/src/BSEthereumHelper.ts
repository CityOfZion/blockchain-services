import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'

export type BSEthereumNetworkId = NetworkId<
  | '1'
  | '10'
  | '25'
  | '56'
  | '137'
  | '250'
  | '1101'
  | '8453'
  | '80002'
  | '42161'
  | '42220'
  | '43114'
  | '59144'
  | '11155111'
  | '47763'
  | '12227332'
>

export class BSEthereumHelper {
  static DEFAULT_DECIMALS = 18
  static #NATIVE_ASSET: Token = {
    decimals: 18,
    hash: '-',
    name: 'ETH',
    symbol: 'ETH',
  }
  static #NATIVE_SYMBOL_BY_NETWORK_ID: Record<BSEthereumNetworkId, string> = {
    '1': 'ETH',
    '10': 'ETH',
    '25': 'CRO',
    '56': 'BNB',
    '137': 'MATIC',
    '1101': 'ETH',
    '250': 'FTM',
    '8453': 'ETH',
    '80002': 'MATIC',
    '42161': 'ETH',
    '42220': 'CELO',
    '43114': 'AVAX',
    '59144': 'ETH',
    '11155111': 'ETH',
    '47763': 'GAS',
    '12227332': 'GAS',
  }

  static #RPC_LIST_BY_NETWORK_ID: Record<BSEthereumNetworkId, string[]> = {
    '1': [
      'https://eth.llamarpc.com',
      'https://mainnet.infura.io/v3/',
      'https://ethereum-rpc.publicnode.com',
      'https://endpoints.omniatech.io/v1/eth/mainnet/public',
      'https://rpc.flashbots.net',
      'https://rpc.mevblocker.io',
    ],
    '10': [
      'https://optimism.llamarpc.com',
      'https://endpoints.omniatech.io/v1/op/mainnet/public',
      'https://optimism-rpc.publicnode.com',
      'https://optimism.meowrpc.com',
      'https://optimism.rpc.subquery.network/public',
    ],
    '25': ['https://cronos-evm-rpc.publicnode.com', 'https://1rpc.io/cro', 'https://rpc.vvs.finance'],
    '56': [
      'https://bsc-dataseed.binance.org/',
      'https://binance.llamarpc.com',
      'https://bsc-dataseed.bnbchain.org',
      'https://endpoints.omniatech.io/v1/bsc/mainnet/public',
      'https://bsc-rpc.publicnode.com',
    ],
    '137': [
      'https://polygon-mainnet.infura.io',
      'https://polygon.llamarpc.com',
      'https://endpoints.omniatech.io/v1/matic/mainnet/public',
      'https://polygon.drpc.org',
      'https://polygon.meowrpc.com',
    ],
    '250': [
      'https://endpoints.omniatech.io/v1/fantom/mainnet/public',
      'https://rpcapi.fantom.network',
      'https://fantom-pokt.nodies.app',
      'https://fantom-rpc.publicnode.com',
      'https://fantom.drpc.org',
    ],
    '1101': [
      'https://polygon-zkevm.drpc.org',
      'https://polygon-zkevm.blockpi.network/v1/rpc/public',
      'https://1rpc.io/polygon/zkevm',
    ],
    '80002': [
      'https://polygon-amoy.drpc.org',
      'https://rpc.ankr.com/polygon_amoy',
      'https://polygon-amoy-bor-rpc.publicnode.com',
    ],
    '8453': [
      'https://base.rpc.subquery.network/public',
      'https://base.llamarpc.com',
      'https://mainnet.base.org',
      'https://1rpc.io/base',
      'https://base.meowrpc.com',
      'https://base-rpc.publicnode.com',
      'https://endpoints.omniatech.io/v1/base/mainnet/public',
    ],
    '42161': [
      'https://arbitrum.llamarpc.com',
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arb-mainnet-public.unifra.io',
      'https://arbitrum-one.publicnode.com',
    ],
    '42220': [
      'https://forno.celo.org',
      'https://api.tatum.io/v3/blockchain/node/celo-mainnet',
      'https://rpc.ankr.com/celo',
    ],
    '43114': [
      'https://avalanche-mainnet.infura.io',
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://avalanche.public-rpc.com',
      'https://endpoints.omniatech.io/v1/avax/mainnet/public',
      'https://avalanche.drpc.org',
    ],
    '59144': [
      'https://linea.decubate.com',
      'https://linea.blockpi.network/v1/rpc/public',
      'https://linea.decubate.com',
    ],
    '11155111': [
      'https://ethereum-sepolia.rpc.subquery.network/public',
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://endpoints.omniatech.io/v1/eth/sepolia/public',
      'https://eth-sepolia.public.blastapi.io',
      'https://eth-sepolia-public.unifra.io',
      'https://1rpc.io/sepolia',
      'https://eth-sepolia.api.onfinality.io/public',
    ],
    '47763': ['https://mainnet-1.rpc.banelabs.org'],
    '12227332': ['https://neoxt4seed1.ngd.network'],
  }

  static DERIVATION_PATH = "m/44'/60'/0'/0/?"
  static DEFAULT_PATH = "44'/60'/0'/0/0"

  static NEOX_TESTNET_NETWORK_ID: BSEthereumNetworkId = '12227332'
  static NEOX_MAINNET_NETWORK_ID: BSEthereumNetworkId = '47763'
  static NEOX_NETWORK_IDS: BSEthereumNetworkId[] = [this.NEOX_TESTNET_NETWORK_ID, this.NEOX_MAINNET_NETWORK_ID]

  static NEOX_TESTNET_NETWORK: Network<BSEthereumNetworkId> = {
    id: this.NEOX_TESTNET_NETWORK_ID,
    name: 'NeoX Testnet',
    url: this.#RPC_LIST_BY_NETWORK_ID[this.NEOX_TESTNET_NETWORK_ID][0],
  }
  static NEOX_MAINNET_NETWORK: Network<BSEthereumNetworkId> = {
    id: this.NEOX_MAINNET_NETWORK_ID,
    name: 'NeoX Mainnet',
    url: this.#RPC_LIST_BY_NETWORK_ID[this.NEOX_MAINNET_NETWORK_ID][0],
  }
  static NEOX_NETWORKS: Network<BSEthereumNetworkId>[] = [this.NEOX_TESTNET_NETWORK, this.NEOX_MAINNET_NETWORK]

  static MAINNET_NETWORK_IDS: BSEthereumNetworkId[] = [
    '1',
    '10',
    '25',
    '56',
    '137',
    '250',
    '8453',
    '42161',
    '42220',
    '43114',
    '59144',
    this.NEOX_MAINNET_NETWORK_ID,
  ]
  static TESTNET_NETWORK_IDS: BSEthereumNetworkId[] = ['1101', '80002', '11155111', this.NEOX_TESTNET_NETWORK_ID]
  static ALL_NETWORK_IDS: BSEthereumNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<BSEthereumNetworkId>[] = [
    {
      id: '1',
      name: 'Ethereum Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['1'][0],
    },
    {
      id: '10',
      name: 'Optimism Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['10'][0],
    },
    {
      id: '25',
      name: 'Cronos Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['25'][0],
    },
    {
      id: '56',
      name: 'Binance Smart Chain Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['56'][0],
    },
    {
      id: '137',
      name: 'Polygon Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['137'][0],
    },
    {
      id: '250',
      name: 'Fantom Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['250'][0],
    },
    {
      id: '8453',
      name: 'Base Protocol Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['8453'][0],
    },
    {
      id: '42161',
      name: 'Arbitrum Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['42161'][0],
    },
    {
      id: '42220',
      name: 'Celo Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['42220'][0],
    },
    {
      id: '43114',
      name: 'Avalanche Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['43114'][0],
    },
    {
      id: '59144',
      name: 'Linea Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['59144'][0],
    },
    this.NEOX_MAINNET_NETWORK,
  ]
  static TESTNET_NETWORKS: Network<BSEthereumNetworkId>[] = [
    {
      id: '1101',
      name: 'Polygon zkEVM Testnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['1101'][0],
    },
    {
      id: '80002',
      name: 'Polygon Testnet Amoy',
      url: this.#RPC_LIST_BY_NETWORK_ID['80002'][0],
    },
    {
      id: '11155111',
      name: 'Sepolia Testnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['11155111'][0],
    },
    this.NEOX_TESTNET_NETWORK,
  ]
  static ALL_NETWORKS: Network<BSEthereumNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]

  static getNativeAsset(network: Network<BSEthereumNetworkId>) {
    const symbol = this.getNativeSymbol(network)

    return { ...this.#NATIVE_ASSET, symbol, name: symbol }
  }

  static getNativeSymbol(network: Network<BSEthereumNetworkId>) {
    return this.#NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
  }

  static getRpcList(network: Network<BSEthereumNetworkId>) {
    return this.#RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSEthereumNetworkId>) {
    return this.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
