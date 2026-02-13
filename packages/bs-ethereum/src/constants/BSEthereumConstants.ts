import type { TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSEthereumNetworkId, TSupportedEVM } from '../types'

export class BSEthereumConstants {
  static readonly DEFAULT_DECIMALS = 18

  static readonly DEFAULT_GAS_LIMIT = 0x5208

  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/60'/0'/0/?"

  static readonly NATIVE_SYMBOL_BY_NETWORK_ID: Record<TBSEthereumNetworkId, string> = {
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

  static readonly NATIVE_WRAPPED_HASH_BY_NETWORK_ID: Partial<Record<TBSEthereumNetworkId, string>> = {
    '1': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '10': '0x4200000000000000000000000000000000000006',
    '25': '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
    '56': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    '137': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    '250': '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    '8453': '0x4200000000000000000000000000000000000006',
    '42161': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '42220': '0x471EcE3750Da237f93B8E339c536989b8978a438',
    '43114': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    '59144': '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f',
  }

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSEthereumNetworkId, string[]> = {
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
      'https://bsc-dataseed.binance.org',
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

  static readonly NETWORKS_BY_EVM: Record<TSupportedEVM, TBSNetwork<TBSEthereumNetworkId>[]> = {
    ethereum: [
      {
        id: '1',
        name: 'Ethereum Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['1'][0],
        type: 'mainnet',
      },
      {
        id: '11155111',
        name: 'Sepolia Testnet',
        url: this.RPC_LIST_BY_NETWORK_ID['11155111'][0],
        type: 'testnet',
      },

      // EVM compatible networks
      {
        id: '10',
        name: 'Optimism Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['10'][0],
        type: 'mainnet',
      },
      {
        id: '25',
        name: 'Cronos Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['25'][0],
        type: 'mainnet',
      },
      {
        id: '56',
        name: 'Binance Smart Chain Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['56'][0],
        type: 'mainnet',
      },
      {
        id: '250',
        name: 'Fantom Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['250'][0],
        type: 'mainnet',
      },

      {
        id: '42220',
        name: 'Celo Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['42220'][0],
        type: 'mainnet',
      },
      {
        id: '43114',
        name: 'Avalanche Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['43114'][0],
        type: 'mainnet',
      },
      {
        id: '59144',
        name: 'Linea Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['59144'][0],
        type: 'mainnet',
      },
    ],
    arbitrum: [
      {
        id: '42161',
        name: 'Arbitrum Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID[42161][0],
        type: 'mainnet',
      },
    ],
    base: [
      {
        id: '8453',
        name: 'Base Protocol Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['8453'][0],
        type: 'mainnet',
      },
    ],
    polygon: [
      {
        id: '137',
        name: 'Polygon Mainnet',
        url: this.RPC_LIST_BY_NETWORK_ID['137'][0],
        type: 'mainnet',
      },
      {
        id: '1101',
        name: 'Polygon zkEVM Testnet',
        url: this.RPC_LIST_BY_NETWORK_ID['1101'][0],
        type: 'testnet',
      },
      {
        id: '80002',
        name: 'Polygon Testnet Amoy',
        url: this.RPC_LIST_BY_NETWORK_ID['80002'][0],
        type: 'testnet',
      },
    ],
  }
}
