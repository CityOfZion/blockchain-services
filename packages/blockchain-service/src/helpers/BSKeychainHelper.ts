import crypto from 'crypto'
import * as bip39 from 'bip39'
import elliptic from 'elliptic'
import { BSError } from '../error'
import { BSBigNumber } from './BSBigNumberHelper'

export class BSKeychainHelper {
  static readonly #alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

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
      const k1 = new BSBigNumber(intermediary.subarray(0, 32).toString('hex'), 16)
      const k2 = new BSBigNumber(key.toString('hex'), 16)
      const c = new BSBigNumber(curve.n!.toString())
      const protoKey = k1.plus(k2).mod(c).toString(16)

      key = Buffer.from(protoKey.padStart(64, '0'), 'hex')
      chainCode = intermediary.slice(32, intermediary.length)
    }

    return key.toString('hex')
  }

  static generateEd25519KeyFromMnemonic(mnemonic: string, path: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)

    const hmac = crypto.createHmac('sha512', 'ed25519 seed')
    const I = hmac.update(seed).digest()
    const masterKey = I.subarray(0, 32)
    const masterChainCode = I.subarray(32)

    const segments = path
      .split('/')
      .slice(1)
      .map((segment: string) => {
        const isHardened = segment.endsWith("'")
        const index = parseInt(segment.replace("'", ''), 10)

        // For Ed25519, all derivations must be hardened
        // Add 0x80000000 for hardened derivation
        return isHardened ? index + 0x80000000 : index
      })

    const { key } = segments.reduce(
      (parentKeys, index) => {
        const indexBuffer = Buffer.alloc(4)
        indexBuffer.writeUInt32BE(index, 0)

        const data = Buffer.concat([Buffer.alloc(1, 0), parentKeys.key, indexBuffer])
        const childI = crypto.createHmac('sha512', parentKeys.chainCode).update(data).digest()

        const childKey = childI.subarray(0, 32)
        const childChainCode = childI.subarray(32)

        return { key: childKey, chainCode: childChainCode }
      },
      { key: masterKey, chainCode: masterChainCode }
    )

    return key
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

  static extractIndexFromPath(bipPath: string): number {
    return parseInt(bipPath.split('/').pop()!)
  }

  static getBipPath(path: string, order = 0) {
    return path.replace('?', order.toString())
  }

  static removeMasterKeyFromBipPath(path: string) {
    return path.replace('m/', '')
  }

  static decodeBase58Check(base58: string): Buffer {
    let num = BigInt(0)

    for (let index = 0; index < base58.length; index++) {
      const char = base58[index]
      const foundIndex = this.#alphabet.indexOf(char)

      if (foundIndex === -1) {
        throw new BSError('Invalid base58 character', 'INVALID_BASE58_CHAR')
      }

      num = num * BigInt(58) + BigInt(foundIndex)
    }

    const hex = num.toString(16)
    const paddedHex = hex.length % 2 === 0 ? hex : `0${hex}`
    const decoded = Buffer.from(paddedHex, 'hex')
    const leadingOnes = base58.match(/^1*/)?.[0]?.length || 0
    const leadingZeros = Buffer.alloc(leadingOnes)
    const fullDecoded = Buffer.concat([leadingZeros, decoded])
    const payload = fullDecoded.subarray(0, -4)
    const checksum = fullDecoded.subarray(-4)
    const hash = crypto.createHash('sha256').update(crypto.createHash('sha256').update(payload).digest()).digest()

    if (!hash.subarray(0, 4).equals(checksum)) {
      throw new BSError('Invalid checksum', 'INVALID_CHECKSUM')
    }

    return payload
  }
}
