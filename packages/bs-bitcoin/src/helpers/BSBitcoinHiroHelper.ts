import axios, { AxiosInstance } from 'axios'

export class BSBitcoinHiroHelper {
  static readonly #apiKey = process.env.HIRO_API_KEY

  static #api?: AxiosInstance

  static getApi() {
    if (!this.#api) {
      this.#api = axios.create({
        baseURL: 'https://api.hiro.so',
        headers: {
          'x-api-key': this.#apiKey,
        },
      })
    }

    return this.#api
  }
}
