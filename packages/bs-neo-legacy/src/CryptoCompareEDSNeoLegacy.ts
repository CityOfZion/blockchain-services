import { CryptoCompareEDS, ExchangeDataService, NetworkType } from '@cityofzion/blockchain-service'
import { TOKENS } from './constants'

export class CryptoCompareEDSNeoLegacy extends CryptoCompareEDS implements ExchangeDataService {
  constructor(networkType: NetworkType) {
    super(networkType, TOKENS[networkType])
  }
}
