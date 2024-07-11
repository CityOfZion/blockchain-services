import { Token } from '@cityofzion/blockchain-service'
import commom from './assets/tokens/common.json'
import mainnet from './assets/tokens/mainnet.json'

export type AvailableNetworkIds = 'mainnet' | 'testnet' | 'custom'

export const TOKENS: Record<AvailableNetworkIds, Token[]> = {
  mainnet: [...commom, ...mainnet],
  testnet: commom,
  custom: commom,
}

export const BLOCKCHAIN_WSS_URL = 'wss://rpc10.n3.nspcc.ru:10331/ws'

export const NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

export const GAS_PER_NEO = 0.001

export const GHOSTMARKET_URL_BY_NETWORK_TYPE: Partial<Record<AvailableNetworkIds, string>> = {
  mainnet: 'https://api.ghostmarket.io/api/v2',
  testnet: 'https://api-testnet.ghostmarket.io/api/v2',
}

export const GHOSTMARKET_CHAIN_BY_NETWORK_TYPE: Partial<Record<AvailableNetworkIds, string>> = {
  mainnet: 'n3',
  testnet: 'n3t',
}

export const DERIVATION_PATH = "m/44'/888'/0'/0/?"

export const RPC_LIST_BY_NETWORK_TYPE: Record<AvailableNetworkIds, string[]> = {
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

export const DEFAULT_URL_BY_NETWORK_TYPE: Record<AvailableNetworkIds, string> = {
  mainnet: RPC_LIST_BY_NETWORK_TYPE.mainnet[0],
  testnet: RPC_LIST_BY_NETWORK_TYPE.testnet[0],
  custom: RPC_LIST_BY_NETWORK_TYPE.custom[0],
}

export type SwapScriptHashes = {
  flamingoSwapRouter: string
  flamingoPairWhiteList: string
  flamingoFactory: string
  neo: string
  gas: string
  bneo: string
  flpBneoGas: string
}

export const SWAP_SCRIPT_HASHES_BY_NETWORK_TYPE: Partial<Record<AvailableNetworkIds, SwapScriptHashes>> = {
  mainnet: {
    flamingoSwapRouter: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
    flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
    flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
    gas: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
    neo: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
    bneo: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
    flpBneoGas: '0x3244fcadcccff190c329f7b3083e4da2af60fbce',
  },
  testnet: {
    flamingoSwapRouter: '0x6f0910fa26290f4a423930c8f833395790c71705',
    flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
    flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
    gas: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
    neo: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
    bneo: '0x85deac50febfd93988d3f391dea54e8289e43e9e',
    flpBneoGas: '0x3244fcadcccff190c329f7b3083e4da2af60fbce',
  },
}
