import { Currency } from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { wallet } from '@cityofzion/neon-js'

let bsNeoLegacy: BSNeoLegacy

describe('BSNeoLegacy', () => {
  beforeEach(() => {
    bsNeoLegacy = new BSNeoLegacy('neoLegacy', { type: 'testnet', url: 'http://seed5.ngd.network:20332' })
  })

  it('Should be able to validate an address', () => {
    const validAddress = 'AJDZ8QP7ydjFicpcXCkG7wczeWEAKxpF69'
    const invalidAddress = 'invalid address'

    expect(bsNeoLegacy.validateAddress(validAddress)).toBeTruthy()
    expect(bsNeoLegacy.validateAddress(invalidAddress)).toBeFalsy()
  })

  it('Should be able to validate an encrypted key', () => {
    const validEncryptedKey = '6PYSsRjFn1v5uu79h5vXGZEYvvRkioHmd1Fd5bUyVp9Gt2wJcLKWHgD6Hy'
    const invalidEncryptedKey = 'invalid encrypted key'

    expect(bsNeoLegacy.validateEncryptedKey(validEncryptedKey)).toBeTruthy()
    expect(bsNeoLegacy.validateEncryptedKey(invalidEncryptedKey)).toBeFalsy()
  })

  it('Should be able to validate a wif', () => {
    const validWif = 'L4ZnhLegkFV9FTys1wBJDHUykn5hLnr15cPqvfuy4E1kzWTE6iRM'
    const invalidWif = 'invalid wif'

    expect(bsNeoLegacy.validateWif(validWif)).toBeTruthy()
    expect(bsNeoLegacy.validateWif(invalidWif)).toBeFalsy()
  })

  it('Should be able to generate a mnemonic', () => {
    expect(() => {
      const mnemonic = bsNeoLegacy.generateMnemonic()
      expect(mnemonic).toHaveLength(12)
    }).not.toThrowError()
  })

  it('Should be able to gererate a account from mnemonic', () => {
    const mnemonic = bsNeoLegacy.generateMnemonic()
    const account = bsNeoLegacy.generateAccount(mnemonic, 0)

    expect(bsNeoLegacy.validateAddress(account.address)).toBeTruthy()
    expect(bsNeoLegacy.validateWif(account.wif)).toBeTruthy()
  })

  it('Should be able to generate a account from wif', () => {
    const mnemonic = bsNeoLegacy.generateMnemonic()
    const account = bsNeoLegacy.generateAccount(mnemonic, 0)

    const accountFromWif = bsNeoLegacy.generateAccountFromWif(account.wif)
    expect(account).toEqual(accountFromWif)
  })

  it('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = bsNeoLegacy.generateMnemonic()
    const account = bsNeoLegacy.generateAccount(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await wallet.encrypt(account.wif, password)
    const decryptedAccount = await bsNeoLegacy.decryptKey(encryptedKey, password)
    expect(decryptedAccount).toEqual(account)
  }, 10000)

  it('Should return a list with prices of tokens using USD', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'USD'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using BRL', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'BRL'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it('Should return a list with prices of tokens using EUR', async () => {
    bsNeoLegacy.network.type = 'mainnet'
    const currency: Currency = 'EUR'
    const tokenPriceList = await bsNeoLegacy.exchange.getTokenPrices(currency)
    expect(tokenPriceList.length).toBeGreaterThan(0)
  })

  it.skip('Should be able to transfer a native asset', async () => {
    const account = bsNeoLegacy.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)
    const balance = await bsNeoLegacy.dataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.symbol === 'GAS')!
    expect(gasBalance?.amount).toBeGreaterThan(0.00000001)

    const transactionHash = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: 0.00000001,
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: gasBalance.hash,
          tokenDecimals: gasBalance.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a nep5 asset', async () => {
    bsNeoLegacy.setNetwork({ type: 'mainnet', url: 'http://seed9.ngd.network:10332' })
    const account = bsNeoLegacy.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)
    const balance = await bsNeoLegacy.dataService.getBalance(account.address)
    const LXBalance = balance.find(b => b.symbol === 'LX')!
    expect(LXBalance?.amount).toBeGreaterThan(0.00000001)

    const transactionHash = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: 0.00000001,
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: LXBalance.hash,
          tokenDecimals: LXBalance.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a nep5 asset with a native asset', async () => {
    bsNeoLegacy.setNetwork({ type: 'mainnet', url: 'http://seed9.ngd.network:10332' })
    const account = bsNeoLegacy.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)
    const balance = await bsNeoLegacy.dataService.getBalance(account.address)
    const LXBalance = balance.find(b => b.symbol === 'LX')!
    expect(LXBalance?.amount).toBeGreaterThan(0.00000001)
    const gasBalance = balance.find(b => b.symbol === bsNeoLegacy.feeToken.symbol)!
    expect(gasBalance?.amount).toBeGreaterThan(0.00000001)

    const transactionHash = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: 0.00000001,
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: LXBalance.hash,
          tokenDecimals: LXBalance.decimals,
        },
        {
          amount: 0.00000001,
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: gasBalance.hash,
          tokenDecimals: gasBalance.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })
})
