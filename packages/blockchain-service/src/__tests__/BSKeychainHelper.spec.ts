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
    expect(privateKey).toBe(process.env.TEST_NEO3_PRIVATE_KEY)
  })

  it('Should normalize a mnemonic with invisible characters and different whitespaces', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const dirtyMnemonic =
      '\uFEFF abandon\u200B abandon\u00A0abandon\tabandon\nabandon\r\nabandon\u3000abandon  abandon \u200Dabandon\u2060 abandon abandon about \u200C'

    expect(BSKeychainHelper.normalizeMnemonic(dirtyMnemonic)).toBe(mnemonic)
    expect(BSKeychainHelper.isValidMnemonic(dirtyMnemonic)).toBe(true)
    expect(BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(dirtyMnemonic, "m/44'/888'/0'/0/0")).toBe(
      process.env.TEST_NEO3_PRIVATE_KEY
    )
  })

  it('Should lowercase a mnemonic when normalizing it', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const differentMnemonic =
      'Abandon ABANDON abandon abandon abandon abandon abandon abandon abandon abandon abandon About'

    expect(BSKeychainHelper.normalizeMnemonic(differentMnemonic)).toBe(mnemonic)
    expect(BSKeychainHelper.isValidMnemonic(differentMnemonic)).toBe(true)
  })

  it('Should validate the mnemonic length according to BIP39', () => {
    const generateWords = (length: number) => Array(length).fill('abandon')

    expect(BSKeychainHelper.isValidMnemonic(generateWords(13))).toBe(false)
    expect(BSKeychainHelper.isValidMnemonic(generateWords(25))).toBe(false)
    expect(BSKeychainHelper.isValidMnemonic(generateWords(12))).toBe(true)
    expect(BSKeychainHelper.isValidMnemonic(generateWords(24))).toBe(true)
  })
})
