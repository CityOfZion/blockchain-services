import { Network, NetworkId } from '@cityofzion/blockchain-service'

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
>

export class BSEthereumConstants {
  static DEFAULT_DECIMALS = 18

  static DEFAULT_GAS_LIMIT = 0x5208

  static readonly ETHEREUM_MAINNET_NETWORK_ID: BSEthereumNetworkId = '1'
  static readonly POLYGON_MAINNET_NETWORK_ID: BSEthereumNetworkId = '137'
  static readonly BASE_MAINNET_NETWORK_ID: BSEthereumNetworkId = '8453'
  static readonly ARBITRUM_MAINNET_NETWORK_ID: BSEthereumNetworkId = '42161'

  static NATIVE_SYMBOL_BY_NETWORK_ID: Record<BSEthereumNetworkId, string> = {
    '1': 'ETH',
    '10': 'ETH',
    '25': 'CRO',
    '56': 'BNB',
    '137': 'POL',
    '1101': 'ETH',
    '250': 'FTM',
    '8453': 'ETH',
    '80002': 'POL',
    '42161': 'ETH',
    '42220': 'CELO',
    '43114': 'AVAX',
    '59144': 'ETH',
    '11155111': 'ETH',
  }

  static NATIVE_WRAPPED_HASH_BY_NETWORK_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    [this.ETHEREUM_MAINNET_NETWORK_ID]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '10': '0x4200000000000000000000000000000000000006',
    '25': '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
    '56': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    [this.POLYGON_MAINNET_NETWORK_ID]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    '250': '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    [this.BASE_MAINNET_NETWORK_ID]: '0x4200000000000000000000000000000000000006',
    [this.ARBITRUM_MAINNET_NETWORK_ID]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '42220': '0x471EcE3750Da237f93B8E339c536989b8978a438',
    '43114': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    '59144': '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f',
  }

  static RPC_LIST_BY_NETWORK_ID: Record<BSEthereumNetworkId, string[]> = {
    '1': [
      'https://eth.llamarpc.com',
      'https://ethereum-rpc.publicnode.com',
      'https://rpc.mevblocker.io',
      'https://rpc.flashbots.net',
      'https://endpoints.omniatech.io/v1/eth/mainnet/public',
    ],
    '10': [
      'https://optimism.llamarpc.com',
      'https://optimism-rpc.publicnode.com',
      'https://optimism.meowrpc.com',
      'https://optimism.rpc.subquery.network/public',
      'https://endpoints.omniatech.io/v1/op/mainnet/public',
    ],
    '25': ['https://cronos-evm-rpc.publicnode.com', 'https://rpc.vvs.finance', 'https://1rpc.io/cro'],
    '56': [
      'https://binance.llamarpc.com',
      'https://bsc-rpc.publicnode.com',
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed.bnbchain.org',
      'https://endpoints.omniatech.io/v1/bsc/mainnet/public',
    ],
    '137': [
      'https://polygon.meowrpc.com',
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://polygon.drpc.org',
      'https://endpoints.omniatech.io/v1/matic/mainnet/public',
    ],
    '250': [
      'https://rpcapi.fantom.network',
      'https://fantom-pokt.nodies.app',
      'https://fantom-rpc.publicnode.com',
      'https://fantom.drpc.org',
      'https://endpoints.omniatech.io/v1/fantom/mainnet/public',
    ],
    '1101': [
      'https://polygon-zkevm.drpc.org',
      'https://1rpc.io/polygon/zkevm',
      'https://polygon-zkevm.blockpi.network/v1/rpc/public',
    ],
    '80002': [
      'https://polygon-amoy.drpc.org',
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon_amoy',
    ],
    '8453': [
      'https://base.llamarpc.com',
      'https://base-rpc.publicnode.com',
      'https://base.meowrpc.com',
      'https://1rpc.io/base',
      'https://mainnet.base.org',
      'https://base.rpc.subquery.network/public',
      'https://endpoints.omniatech.io/v1/base/mainnet/public',
    ],
    '42161': [
      'https://arbitrum.llamarpc.com',
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arbitrum-one.publicnode.com',
      'https://arb-mainnet-public.unifra.io',
    ],
    '42220': ['https://forno.celo.org', 'https://rpc.ankr.com/celo'],
    '43114': [
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://avalanche.public-rpc.com',
      'https://avalanche.drpc.org',
      'https://endpoints.omniatech.io/v1/avax/mainnet/public',
    ],
    '59144': [
      'https://linea.drpc.org',
      'https://linea.blockpi.network/v1/rpc/public',
      'https://rpc.linea.build',
      'https://1rpc.io/linea',
    ],
    '11155111': [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://ethereum-sepolia.rpc.subquery.network/public',
      'https://1rpc.io/sepolia',
      'https://eth-sepolia.api.onfinality.io/public',
      'https://eth-sepolia.public.blastapi.io',
      'https://eth-sepolia-public.unifra.io',
      'https://endpoints.omniatech.io/v1/eth/sepolia/public',
    ],
  }

  static DEFAULT_BIP44_DERIVATION_PATH = "m/44'/60'/0'/0/?"

  static MAINNET_NETWORK_IDS: BSEthereumNetworkId[] = [
    this.ETHEREUM_MAINNET_NETWORK_ID,
    '10',
    '25',
    '56',
    this.POLYGON_MAINNET_NETWORK_ID,
    '250',
    this.BASE_MAINNET_NETWORK_ID,
    this.ARBITRUM_MAINNET_NETWORK_ID,
    '42220',
    '43114',
    '59144',
  ]
  static TESTNET_NETWORK_IDS: BSEthereumNetworkId[] = ['1101', '80002', '11155111']
  static ALL_NETWORK_IDS: BSEthereumNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<BSEthereumNetworkId>[] = [
    {
      id: this.ETHEREUM_MAINNET_NETWORK_ID,
      name: 'Ethereum Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID[this.ETHEREUM_MAINNET_NETWORK_ID][0],
    },
    {
      id: '10',
      name: 'Optimism Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['10'][0],
    },
    {
      id: '25',
      name: 'Cronos Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['25'][0],
    },
    {
      id: '56',
      name: 'Binance Smart Chain Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['56'][0],
    },
    {
      id: this.POLYGON_MAINNET_NETWORK_ID,
      name: 'Polygon Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID[this.POLYGON_MAINNET_NETWORK_ID][0],
    },
    {
      id: '250',
      name: 'Fantom Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['250'][0],
    },
    {
      id: this.BASE_MAINNET_NETWORK_ID,
      name: 'Base Protocol Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID[this.BASE_MAINNET_NETWORK_ID][0],
    },
    {
      id: this.ARBITRUM_MAINNET_NETWORK_ID,
      name: 'Arbitrum Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID[this.ARBITRUM_MAINNET_NETWORK_ID][0],
    },
    {
      id: '42220',
      name: 'Celo Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['42220'][0],
    },
    {
      id: '43114',
      name: 'Avalanche Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['43114'][0],
    },
    {
      id: '59144',
      name: 'Linea Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['59144'][0],
    },
  ]
  static TESTNET_NETWORKS: Network<BSEthereumNetworkId>[] = [
    {
      id: '1101',
      name: 'Polygon zkEVM Testnet',
      url: this.RPC_LIST_BY_NETWORK_ID['1101'][0],
    },
    {
      id: '80002',
      name: 'Polygon Testnet Amoy',
      url: this.RPC_LIST_BY_NETWORK_ID['80002'][0],
    },
    {
      id: '11155111',
      name: 'Sepolia Testnet',
      url: this.RPC_LIST_BY_NETWORK_ID['11155111'][0],
    },
  ]
  static ALL_NETWORKS: Network<BSEthereumNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  // If tou change this, make sure to update the tests accordingly
  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]
}
