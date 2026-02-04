import { BIP32API, BIP32Factory } from 'bip32'
import * as secp256k1 from '@bitcoinerlab/secp256k1'

export class BSBitcoinBIP32SingletonHelper {
  static #instance: BIP32API

  static getInstance() {
    if (!BSBitcoinBIP32SingletonHelper.#instance) {
      BSBitcoinBIP32SingletonHelper.#instance = BIP32Factory(secp256k1)
    }

    return BSBitcoinBIP32SingletonHelper.#instance
  }
}
