import { ECPairAPI, ECPairFactory } from 'ecpair'
import * as secp256k1 from '@bitcoinerlab/secp256k1'

export class BSBitcoinECPairSingletonHelper {
  static #instance: ECPairAPI

  static getInstance() {
    if (!BSBitcoinECPairSingletonHelper.#instance) {
      BSBitcoinECPairSingletonHelper.#instance = ECPairFactory(secp256k1)
    }

    return BSBitcoinECPairSingletonHelper.#instance
  }
}
