import { NetworkType, Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'

export type BitqueryNetwork = 'ethereum' | 'goerli'

export const TOKENS: Record<NetworkType, Token[]> = {
  mainnet: [...commom],
  testnet: commom,
  custom: commom,
}

export const NATIVE_ASSETS = commom

export const BITQUERY_MIRROR_URL = 'https://i4l7kcg43c.execute-api.us-east-1.amazonaws.com/production/'
export const BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, BitqueryNetwork> = {
  mainnet: 'ethereum',
  testnet: 'goerli',
}

export const GHOSTMARKET_URL_BY_NETWORK_TYPE: Partial<Record<NetworkType, string>> = {
  mainnet: 'https://api.ghostmarket.io/api/v2',
  testnet: 'https://api-testnet.ghostmarket.io/api/v2',
}

export const GHOSTMARKET_CHAIN_BY_NETWORK_TYPE: Partial<Record<NetworkType, string>> = {
  mainnet: 'eth',
  testnet: 'etht',
}

export const DERIVATION_PATH = "m/44'/60'/0'/0/?"

export const RPC_LIST_BY_NETWORK_TYPE: Record<NetworkType, string[]> = {
  mainnet: [
    'https://ethereum-mainnet-rpc.allthatnode.com',
    'https://eth.llamarpc.com',
    'https://ethereum-rpc.publicnode.com',
    'https://endpoints.omniatech.io/v1/eth/mainnet/public',
    'https://rpc.flashbots.net',
    'https://rpc.mevblocker.io',
  ],
  testnet: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://endpoints.omniatech.io/v1/eth/sepolia/public',
    'https://eth-sepolia.public.blastapi.io',
    'https://eth-sepolia-public.unifra.io',
    'https://1rpc.io/sepolia',
    'https://eth-sepolia.api.onfinality.io/public',
  ],
  custom: ['http://127.0.0.1:8545'],
}

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<NetworkType, string> = {
  mainnet: RPC_LIST_BY_NETWORK_TYPE.mainnet[0],
  testnet: RPC_LIST_BY_NETWORK_TYPE.testnet[0],
  custom: RPC_LIST_BY_NETWORK_TYPE.custom[0],
}
