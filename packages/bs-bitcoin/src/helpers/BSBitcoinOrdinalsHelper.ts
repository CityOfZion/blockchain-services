import axios from 'axios'
import { BSCommonConstants } from '@cityofzion/blockchain-service'

export class BSBitcoinOrdinalsHelper {
  static getApi() {
    return axios.create({ baseURL: `${BSCommonConstants.COZ_API_URL}/api/v2/bitcoin/ordinals/mainnet` })
  }
}
