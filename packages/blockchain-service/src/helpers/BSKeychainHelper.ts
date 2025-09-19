import BigNumber from 'bignumber.js'
import crypto from 'crypto'
import * as bip39 from 'bip39'
import elliptic from 'elliptic'

export class BSKeychainHelper {
  static generateNeoPrivateKeyFromMnemonic(mnemonic: string, path: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)

    const masterKeyHmac = crypto
      .createHmac('sha512', Buffer.from('Nist256p1 seed'))
      .update(Uint8Array.from(seed))
      .digest()

    const pathArray = path.split('/').slice(1)
    const curve = new elliptic.ec('p256')
    let chainCode = masterKeyHmac.subarray(32, masterKeyHmac.length)
    let key = masterKeyHmac.subarray(0, 32)

    for (const stringIdx of pathArray) {
      let childIdx: number
      let data: Buffer

      if (stringIdx.slice(-1) === "'") {
        data = Buffer.concat([Buffer.from('00', 'hex'), key])
        childIdx = parseInt(stringIdx.slice(0, stringIdx.length - 1), 10) + 0x80000000
      } else {
        const pk = curve.keyFromPrivate(key, 'hex')
        data = Buffer.from(pk.getPublic().encodeCompressed())
        childIdx = parseInt(stringIdx, 10)
      }

      data = Buffer.concat([data, Buffer.from(childIdx.toString(16).padStart(8, '0'), 'hex')])
      const intermediary = crypto.createHmac('sha512', chainCode).update(data).digest()

      const k1 = new BigNumber(intermediary.subarray(0, 32).toString('hex'), 16)
      const k2 = new BigNumber(key.toString('hex'), 16)
      const c = new BigNumber(curve.n!.toString())
      const protoKey = k1.plus(k2).mod(c).toString(16)

      key = Buffer.from(protoKey.padStart(64, '0'), 'hex')
      chainCode = intermediary.slice(32, intermediary.length)
    }

    return key.toString('hex')
  }

  static generateMnemonic() {
    return bip39.generateMnemonic(128)
  }

  static isValidMnemonic(word: string | string[]) {
    const wordArray = Array.isArray(word) ? word : word.trim().split(' ')
    return wordArray.length === 12 || wordArray.length === 24
  }

  static isMnemonic(word: string | string[]) {
    const wordArray = Array.isArray(word) ? word : word.trim().split(' ')
    return wordArray.length > 1
  }

  static extractIndexFromPath(bip44Path: string): number {
    return parseInt(bip44Path.split('/').pop()!)
  }

  static getBip44Path(path: string, order = 0) {
    return path.replace('?', order.toString())
  }
}
