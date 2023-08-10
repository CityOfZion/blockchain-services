import { NetworkType, Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'
import mainnet from './assets/tokens/mainnet.json'

export const TOKENS: Record<NetworkType, Token[]> = {
  mainnet: [...commom, ...mainnet],
  testnet: commom,
  custom: commom,
}

export const LEGACY_NETWORK_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, string> = {
  mainnet: 'MainNet',
  testnet: 'TestNet',
}

export const NATIVE_ASSETS = commom

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, string> = {
  mainnet: 'http://seed9.ngd.network:10332',
  testnet: 'http://seed5.ngd.network:20332',
}
