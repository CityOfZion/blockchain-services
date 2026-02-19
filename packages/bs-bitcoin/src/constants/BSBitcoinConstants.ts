import type { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import type { TBSBitcoinNetworkId } from '../types'

export class BSBitcoinConstants {
  static readonly #API_URL = 'https://api.tatum.io'

  static readonly BIP84_DERIVATION_PATHS_BY_NETWORK_ID: Record<TBSBitcoinNetworkId, string> = {
    mainnet: "m/84'/0'/0'/0/?",
    testnet: "m/84'/1'/0'/0/?",
  }

  static readonly ONE_BTC_IN_SATOSHIS = 1_0000_0000

  static readonly NATIVE_TOKEN: TBSToken = {
    symbol: 'BTC',
    name: 'Bitcoin',
    hash: '-',
    decimals: 8,
  }

  static readonly API_URLS_BY_NETWORK_ID: Record<TBSBitcoinNetworkId, string> = {
    mainnet: this.#API_URL,
    testnet: this.#API_URL,
  }

  static readonly MAINNET_NETWORK: TBSNetwork<TBSBitcoinNetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.API_URLS_BY_NETWORK_ID.mainnet,
    type: 'mainnet',
  }

  static readonly TESTNET_NETWORK: TBSNetwork<TBSBitcoinNetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.API_URLS_BY_NETWORK_ID.testnet,
    type: 'testnet',
  }
}
