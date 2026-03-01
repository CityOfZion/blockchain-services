import type { TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSBitcoinNetworkId, TTatumApis } from '../types'
import axios from 'axios'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

export class BSBitcoinTatumHelper {
  static readonly #mainnetApiKey = process.env.TATUM_MAINNET_API_KEY
  static readonly #testnetApiKey = process.env.TATUM_TESTNET_API_KEY

  static getApis(network: TBSNetwork<TBSBitcoinNetworkId>): TTatumApis {
    const isMainnet = network.type === 'mainnet'
    const { url } = isMainnet ? BSBitcoinConstants.MAINNET_NETWORK : BSBitcoinConstants.TESTNET_NETWORK
    const headers = { 'x-api-key': isMainnet ? this.#mainnetApiKey : this.#testnetApiKey }

    return {
      v3: axios.create({ baseURL: `${url}/v3`, headers }),
      v4: axios.create({ baseURL: `${url}/v4`, headers }),
    }
  }
}
