import { Token } from '@cityofzion/blockchain-service'
import { AVAX, BNB, CELO, CRO, ETH, FTM, GAS, MATIC } from './assets/tokens'

export type AvailableNetworkIds =
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
  | '12227331'

export const DERIVATION_PATH = "m/44'/60'/0'/0/?"
export const DEFAULT_PATH = "44'/60'/0'/0/0"

export const NATIVE_ASSET_BY_NETWORK_ID: Record<AvailableNetworkIds, Token> = {
  '1': ETH,
  '10': ETH,
  '25': CRO,
  '56': BNB,
  '137': MATIC,
  '1101': ETH,
  '250': FTM,
  '8453': ETH,
  '80002': MATIC,
  '42161': ETH,
  '42220': CELO,
  '43114': AVAX,
  '59144': ETH,
  '11155111': ETH,
  '12227331': GAS,
}

export const RPC_LIST_BY_NETWORK_ID: Record<AvailableNetworkIds, string[]> = {
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
  '59144': ['https://linea.decubate.com', 'https://linea.blockpi.network/v1/rpc/public', 'https://linea.decubate.com'],
  '11155111': [
    'https://ethereum-sepolia.rpc.subquery.network/public',
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://endpoints.omniatech.io/v1/eth/sepolia/public',
    'https://eth-sepolia.public.blastapi.io',
    'https://eth-sepolia-public.unifra.io',
    'https://1rpc.io/sepolia',
    'https://eth-sepolia.api.onfinality.io/public',
  ],
  '12227331': ['https://neoxseed1.ngd.network'],
}

export const DEFAULT_URL_BY_NETWORK_ID: Record<AvailableNetworkIds, string> = {
  '1': RPC_LIST_BY_NETWORK_ID['1'][0],
  '10': RPC_LIST_BY_NETWORK_ID['10'][0],
  '25': RPC_LIST_BY_NETWORK_ID['25'][0],
  '56': RPC_LIST_BY_NETWORK_ID['56'][0],
  '137': RPC_LIST_BY_NETWORK_ID['137'][0],
  '250': RPC_LIST_BY_NETWORK_ID['250'][0],
  '1101': RPC_LIST_BY_NETWORK_ID['1101'][0],
  '8453': RPC_LIST_BY_NETWORK_ID['8453'][0],
  '80002': RPC_LIST_BY_NETWORK_ID['80002'][0],
  '42161': RPC_LIST_BY_NETWORK_ID['42161'][0],
  '42220': RPC_LIST_BY_NETWORK_ID['42220'][0],
  '43114': RPC_LIST_BY_NETWORK_ID['43114'][0],
  '59144': RPC_LIST_BY_NETWORK_ID['59144'][0],
  '11155111': RPC_LIST_BY_NETWORK_ID['11155111'][0],
  '12227331': RPC_LIST_BY_NETWORK_ID['12227331'][0],
}

export const NETWORK_NAME_BY_NETWORK_ID: Record<AvailableNetworkIds, string> = {
  '1': 'Ethereum Mainnet',
  '10': 'Optimism Mainnet',
  '25': 'Cronos Mainnet',
  '56': 'Binance Smart Chain Mainnet',
  '137': 'Polygon Mainnet',
  '250': 'Fantom Opera',
  '1101': 'Polygon zkEVM',
  '8453': 'Base',
  '80002': 'Polygon Amoy',
  '42161': 'Arbitrum One',
  '42220': 'Celo Mainnet',
  '43114': 'Avalanche C-Chain',
  '59144': 'Linea',
  '11155111': 'Ethereum Sepolia',
  '12227331': 'NeoX Testnet',
}

export const BITQUERY_MIRROR_URL = 'https://i4l7kcg43c.execute-api.us-east-1.amazonaws.com/production/'
export const BITQUERY_MIRROR_NETWORK_BY_NETWORK_ID: Partial<Record<AvailableNetworkIds, string>> = {
  '1': 'ethereum',
  '25': 'cronos',
  '56': 'bsc',
  '137': 'matic',
  '250': 'fantom',
  '42220': 'celo_mainnet',
  '43114': 'avalanche',
}

export const GHOSTMARKET_URL_BY_NETWORK_TYPE: Partial<Record<AvailableNetworkIds, string>> = {
  1: 'https://api.ghostmarket.io/api/v2',
}

export const GHOSTMARKET_CHAIN_BY_NETWORK_TYPE: Partial<Record<AvailableNetworkIds, string>> = {
  1: 'eth',
}
