import { Keychain } from '@moonlight-io/asteroid-sdk-js'

export const keychain = new Keychain()

export function generateMnemonic() {
  keychain.generateMnemonic(128)
  if (!keychain.mnemonic) throw new Error('Failed to generate mnemonic')
  return keychain.mnemonic.toString().split(' ')
}
