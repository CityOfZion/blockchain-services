import { BSKeychainHelper } from '../helpers/BSKeychainHelper'

describe('BSKeychainHelper', () => {
  it('Should be able to generate a mnemonic', () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    expect(BSKeychainHelper.isValidMnemonic(mnemonic)).toBe(true)
  })

  it('Should be able to generate a neo private key from mnemonic', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const path = "m/44'/888'/0'/0/0"
    const privateKey = BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(mnemonic, path)
    expect(privateKey).toBe('38bcb1943801333aecdb9099b368ca8ea5b13a2c22862f8e1be77a46ed88738b')
  })
})
