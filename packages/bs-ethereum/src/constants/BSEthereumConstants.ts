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
  | '47763'
  | '12227332'
>

export class BSEthereumConstants {
  static DEFAULT_DECIMALS = 18

  static DEFAULT_GAS_LIMIT = 0x5208

  static NATIVE_SYMBOL_BY_NETWORK_ID: Record<BSEthereumNetworkId, string> = {
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
      'https://polygon.llamarpc.com',
      'https://polygon.drpc.org',
      'https://polygon.meowrpc.com',
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
    '59144': ['https://linea.decubate.com', 'https://linea.blockpi.network/v1/rpc/public'],
    '11155111': [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://ethereum-sepolia.rpc.subquery.network/public',
      'https://1rpc.io/sepolia',
      'https://eth-sepolia.api.onfinality.io/public',
      'https://eth-sepolia.public.blastapi.io',
      'https://eth-sepolia-public.unifra.io',
      'https://endpoints.omniatech.io/v1/eth/sepolia/public',
    ],
    '47763': ['https://mainnet-1.rpc.banelabs.org'],
    '12227332': ['https://neoxt4seed1.ngd.network'],
  }

  static DEFAULT_BIP44_DERIVATION_PATH = "m/44'/60'/0'/0/?"

  static NEOX_TESTNET_NETWORK_ID: BSEthereumNetworkId = '12227332'
  static NEOX_MAINNET_NETWORK_ID: BSEthereumNetworkId = '47763'
  static NEOX_NETWORK_IDS: BSEthereumNetworkId[] = [this.NEOX_TESTNET_NETWORK_ID, this.NEOX_MAINNET_NETWORK_ID]

  static NEOX_TESTNET_NETWORK: Network<BSEthereumNetworkId> = {
    id: this.NEOX_TESTNET_NETWORK_ID,
    name: 'NeoX Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID[this.NEOX_TESTNET_NETWORK_ID][0],
  }
  static NEOX_MAINNET_NETWORK: Network<BSEthereumNetworkId> = {
    id: this.NEOX_MAINNET_NETWORK_ID,
    name: 'NeoX Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID[this.NEOX_MAINNET_NETWORK_ID][0],
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
      url: this.RPC_LIST_BY_NETWORK_ID['1'][0],
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
      id: '137',
      name: 'Polygon Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['137'][0],
    },
    {
      id: '250',
      name: 'Fantom Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['250'][0],
    },
    {
      id: '8453',
      name: 'Base Protocol Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['8453'][0],
    },
    {
      id: '42161',
      name: 'Arbitrum Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['42161'][0],
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
    this.NEOX_MAINNET_NETWORK,
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
    this.NEOX_TESTNET_NETWORK,
  ]
  static ALL_NETWORKS: Network<BSEthereumNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]
}
