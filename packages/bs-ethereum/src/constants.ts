import { NetworkType, Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'

export type BitqueryNetwork = 'ethereum' | 'goerli'

export const TOKENS: Record<NetworkType, Token[]> = {
  mainnet: [...commom],
  testnet: commom,
  custom: commom,
}

export const NATIVE_ASSETS = commom

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<NetworkType, string> = {
  mainnet: 'https://ethereum-mainnet-rpc.allthatnode.com',
  testnet: 'https://ethereum-goerli-rpc.allthatnode.com',
  custom: 'http://127.0.0.1:8545',
}

export const BITQUERY_API_KEY = 'BQYMp76Ny15C8ORbI2BOstFUhoMCahLI'
export const BITQUERY_URL = 'https://graphql.bitquery.io'
export const BITQUERY_NETWORK_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, BitqueryNetwork> = {
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
