import axios from 'axios'
import { BSCommonConstants, BSUtilsHelper } from '@cityofzion/blockchain-service'

export class BSBitcoinXverseHelper {
  static readonly #delayTime = 1000
  static #lastRequestTime = 0

  static getApi() {
    const api = axios.create({ baseURL: `${BSCommonConstants.COZ_API_URL}/api/v2/bitcoin/xverse/mainnet` })

    api.interceptors.request.use(async config => {
      const requestTime = Date.now()
      const timeSinceLastRequest = requestTime - this.#lastRequestTime

      if (timeSinceLastRequest < this.#delayTime) {
        // Wait to avoid rate limit
        await BSUtilsHelper.wait(this.#delayTime - timeSinceLastRequest)
      }

      this.#lastRequestTime = Date.now()

      return config
    })

    return api
  }
}
