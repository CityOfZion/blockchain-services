import axios, { type AxiosInstance } from 'axios'
import { BSCommonConstants } from '@cityofzion/blockchain-service'

export class BSBitcoinMoralisHelper {
  static getApi(): AxiosInstance {
    return axios.create({
      baseURL: `${BSCommonConstants.COZ_API_URL}/v2/p/bitcoin/moralis/mainnet`,
    })
  }
}
