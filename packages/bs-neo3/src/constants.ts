import { NetworkType, Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'
import mainnet from './assets/tokens/mainnet.json'

export const TOKENS: Record<NetworkType, Token[]> = {
  mainnet: [...commom, ...mainnet],
  testnet: commom,
  custom: commom,
}

export const NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<NetworkType, string> = {
  mainnet: 'https://mainnet1.neo.coz.io:443',
  testnet: 'https://testnet1.neo.coz.io:443',
  custom: 'http://127.0.0.1:50012',
}
