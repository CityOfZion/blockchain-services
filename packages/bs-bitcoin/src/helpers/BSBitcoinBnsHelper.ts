import axios from 'axios'

export class BSBitcoinBnsHelper {
  static getApi() {
    return axios.create({ baseURL: 'https://api.bnsv2.com' })
  }
}
