import { BSCommonConstants, BSError, type TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSBitcoinNetworkId } from '../types'
import axios, { type AxiosInstance } from 'axios'

export class BSBitcoinTatumHelper {
  static getApi({ type }: TBSNetwork<TBSBitcoinNetworkId>): AxiosInstance {
    const isMainnet = type === 'mainnet'

    if (!isMainnet && type !== 'testnet') {
      throw new BSError('Only mainnet and testnet are supported', 'INVALID_NETWORK')
    }

    const api = axios.create({ baseURL: `${BSCommonConstants.COZ_API_URL}/api/v2/bitcoin/tatum/${type}` })

    api.interceptors.request.use(config => {
      const isV4 = config.url?.startsWith('/v4')

      if (isV4) {
        if (!config.params) config.params = {}

        config.params.chain = isMainnet ? 'bitcoin-mainnet' : 'bitcoin-testnet'
      }

      return config
    })

    return api
  }
}
