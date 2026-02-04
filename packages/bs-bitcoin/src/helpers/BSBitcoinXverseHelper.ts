import axios from 'axios'
import { BSUtilsHelper } from '@cityofzion/blockchain-service'

export class BSBitcoinXverseHelper {
  static readonly #apiKey = process.env.XVERSE_API_KEY
  static readonly #delayTime = 1000
  static #lastRequestTime = 0

  static getApi() {
    const api = axios.create({
      baseURL: 'https://api.secretkeylabs.io',
      headers: {
        'x-api-key': this.#apiKey,
      },
    })

    api.interceptors.request.use(async config => {
      const requestTime = Date.now()
      const timeSinceLastRequest = requestTime - this.#lastRequestTime

      if (timeSinceLastRequest < this.#delayTime) {
        await BSUtilsHelper.wait(this.#delayTime - timeSinceLastRequest)
      }

      this.#lastRequestTime = Date.now()

      return config
    })

    return api
  }
}
