import axios, { AxiosInstance } from 'axios'

export class BSBitcoinOrdinalsHelper {
  static #api?: AxiosInstance

  static getApi() {
    if (!this.#api) {
      this.#api = axios.create({ baseURL: 'https://ordinals.com' })
    }

    return this.#api
  }
}
