import axios from 'axios'

export class BSBitcoinOrdinalsHelper {
  static getApi() {
    return axios.create({ baseURL: 'https://ordinals.com' })
  }
}
