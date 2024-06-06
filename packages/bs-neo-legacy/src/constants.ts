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

export const DERIVATION_PATH = "m/44'/888'/0'/0/?"

export const RPC_LIST_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, string[]> = {
  mainnet: [
    'http://seed9.ngd.network:10332',
    'https://mainnet1.neo2.coz.io:443',
    'https://mainnet2.neo2.coz.io:443',
    'https://mainnet3.neo2.coz.io:443',
    'http://seed1.ngd.network:10332',
    'http://seed2.ngd.network:10332',
    'http://seed3.ngd.network:10332',
    'http://seed4.ngd.network:10332',
    'http://seed5.ngd.network:10332',
  ],
  testnet: [
    'http://seed5.ngd.network:20332',
    'http://seed1.ngd.network:20332',
    'http://seed2.ngd.network:20332',
    'https://testnet1.neo2.coz.io:443',
  ],
}

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<Exclude<NetworkType, 'custom'>, string> = {
  mainnet: RPC_LIST_BY_NETWORK_TYPE.mainnet[0],
  testnet: RPC_LIST_BY_NETWORK_TYPE.testnet[0],
}
