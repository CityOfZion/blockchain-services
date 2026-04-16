import { BSBigUnitAmount, type TBSNetwork, type TBSToken } from '@cityofzion/blockchain-service'
import type { TBSBitcoinNetworkId } from '../types'

export class BSBitcoinConstants {
  static readonly #API_URL = 'https://api.tatum.io'

  static readonly BIP_DERIVATION_PATHS_BY_NETWORK_ID: Record<TBSBitcoinNetworkId, string> = {
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

  // 10 bytes represents version + locktime + counters
  static readonly OVERHEAD_SIZE = 10

  static readonly P2WPKH_INPUT_SIZE = 68
  static readonly P2PKH_INPUT_SIZE = 148
  static readonly P2SH_INPUT_SIZE = 91

  static readonly P2WPKH_OUTPUT_SIZE = 31
  static readonly P2PKH_OUTPUT_SIZE = 34
  static readonly P2SH_OUTPUT_SIZE = 32

  static readonly AMOUNT_DUST_LIMIT_BN = new BSBigUnitAmount('546', this.NATIVE_TOKEN.decimals).toHuman()
}
