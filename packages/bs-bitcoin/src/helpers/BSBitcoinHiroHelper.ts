import axios from 'axios'
import { BSCommonConstants } from '@cityofzion/blockchain-service'

export class BSBitcoinHiroHelper {
  static getApi() {
    return axios.create({ baseURL: `${BSCommonConstants.COZ_API_URL}/v2/p/bitcoin/hiro/mainnet` })
  }
}
