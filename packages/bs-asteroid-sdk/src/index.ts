import { AsteroidSDK } from './AsteroidSDK'

export const keychain = new AsteroidSDK.Keychain()

export const generateMnemonic = () => {
  keychain.generateMnemonic(128)
  if (!keychain.mnemonic) throw new Error('Failed to generate mnemonic')
  return keychain.mnemonic.toString().split(' ')
}
