import { NetworkType, Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'
import mainnet from './assets/tokens/mainnet.json'

export const TOKENS: Record<NetworkType, Token[]> = {
  mainnet: [...commom, ...mainnet],
  testnet: commom,
  custom: commom,
}

export const NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

export const GHOSTMARKET_URL_BY_NETWORK_TYPE: Partial<Record<NetworkType, string>> = {
  mainnet: 'https://api.ghostmarket.io/api/v2',
  testnet: 'https://api-testnet.ghostmarket.io/api/v2',
}

export const GHOSTMARKET_CHAIN_BY_NETWORK_TYPE: Partial<Record<NetworkType, string>> = {
  mainnet: 'n3',
  testnet: 'n3t',
}

export const DERIVATION_PATH = "m/44'/888'/0'/0/?"

export const RPC_LIST_BY_NETWORK_TYPE: Record<NetworkType, string[]> = {
  mainnet: [
    'https://mainnet1.neo.coz.io:443',
    'https://mainnet4.neo.coz.io:443',
    'http://seed1.neo.org:10332',
    'http://seed2.neo.org:10332',
    'https://mainnet2.neo.coz.io:443',
    'https://mainnet5.neo.coz.io:443',
    'https://mainnet3.neo.coz.io:443',
    'https://rpc10.n3.nspcc.ru:10331',
    'https://neo1-nodes.ghostmarket.io:443',
  ],
  testnet: [
    'https://testnet1.neo.coz.io:443',
    'https://testnet2.neo.coz.io:443',
    'https://rpc.t5.n3.nspcc.ru:20331',
    'http://seed1t5.neo.org:20332',
    'http://seed2t5.neo.org:20332',
    'http://seed3t5.neo.org:20332',
    'http://seed4t5.neo.org:20332',
    'http://seed5t5.neo.org:20332',
  ],
  custom: ['http://127.0.0.1:50012'],
}

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<NetworkType, string> = {
  mainnet: RPC_LIST_BY_NETWORK_TYPE.mainnet[0],
  testnet: RPC_LIST_BY_NETWORK_TYPE.testnet[0],
  custom: RPC_LIST_BY_NETWORK_TYPE.custom[0],
}
