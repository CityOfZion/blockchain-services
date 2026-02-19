import axios from 'axios'

export class BSBitcoinHiroHelper {
  static readonly #apiKey = process.env.HIRO_API_KEY

  static getApi() {
    return axios.create({
      baseURL: 'https://api.hiro.so',
      headers: {
        'x-api-key': this.#apiKey,
      },
    })
  }
}
