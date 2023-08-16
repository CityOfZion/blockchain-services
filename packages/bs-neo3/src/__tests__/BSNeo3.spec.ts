import { wallet } from '@cityofzion/neon-js'
import { sleep } from './utils/sleep'
import { BSNeo3 } from '../BSNeo3'

let bsNeo3: BSNeo3

describe('BSNeo3', () => {
  beforeAll(() => {
    bsNeo3 = new BSNeo3('neo3', { type: 'testnet', url: 'https://testnet1.neo.coz.io:443' })
  })

  it('Should be able to validate an address', () => {
    const validAddress = 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe'
    const invalidAddress = 'invalid address'

    expect(bsNeo3.validateAddress(validAddress)).toBeTruthy()
    expect(bsNeo3.validateAddress(invalidAddress)).toBeFalsy()
  })

  it('Should be able to validate an encrypted key', () => {
    const validEncryptedKey = '6PYVPVe1fQznphjbUxXP9KZJqPMVnVwCx5s5pr5axRJ8uHkMtZg97eT5kL'
    const invalidEncryptedKey = 'invalid encrypted key'

    expect(bsNeo3.validateEncryptedKey(validEncryptedKey)).toBeTruthy()
    expect(bsNeo3.validateEncryptedKey(invalidEncryptedKey)).toBeFalsy()
  })

  it('Should be able to validate a wif', () => {
    const validWif = 'L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP'
    const invalidWif = 'invalid wif'

    expect(bsNeo3.validateWif(validWif)).toBeTruthy()
    expect(bsNeo3.validateWif(invalidWif)).toBeFalsy()
  })

  it('Should be able to validate an domain', () => {
    const validDomain = 'test.neo'
    const invalidDomain = 'invalid domain'

    expect(bsNeo3.validateNNSFormat(validDomain)).toBeTruthy()
    expect(bsNeo3.validateNNSFormat(invalidDomain)).toBeFalsy()
  })

  it('Should be able to generate a mnemonic', () => {
    expect(() => {
      const mnemonic = bsNeo3.generateMnemonic()
      expect(mnemonic).toHaveLength(12)
    }).not.toThrowError()
  })

  it('Should be able to gererate a account from mnemonic', () => {
    const mnemonic = bsNeo3.generateMnemonic()
    const account = bsNeo3.generateAccount(mnemonic, 0)

    expect(bsNeo3.validateAddress(account.address)).toBeTruthy()
    expect(bsNeo3.validateWif(account.wif)).toBeTruthy()
  })

  it('Should be able to generate a account from wif', () => {
    const mnemonic = bsNeo3.generateMnemonic()
    const account = bsNeo3.generateAccount(mnemonic, 0)

    const accountFromWif = bsNeo3.generateAccountFromWif(account.wif)
    expect(account).toEqual(accountFromWif)
  })

  it('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = bsNeo3.generateMnemonic()
    const account = bsNeo3.generateAccount(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await wallet.encrypt(account.wif, password)
    const decryptedAccount = await bsNeo3.decryptKey(encryptedKey, password)
    expect(decryptedAccount).toEqual(account)
  }, 20000)

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = bsNeo3.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: 0.00000001,
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: bsNeo3.feeToken.hash,
          tokenDecimals: bsNeo3.feeToken.decimals,
        },
      ],
    })

    expect(fee).toEqual({
      total: expect.any(Number),
      networkFee: expect.any(Number),
      systemFee: expect.any(Number),
    })
  })

  it.skip('Should be able to transfer', async () => {
    const account = bsNeo3.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)
    const balance = await bsNeo3.dataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.symbol === bsNeo3.feeToken.symbol)
    expect(gasBalance?.amount).toBeGreaterThan(0.00000001)

    const transactionHash = await bsNeo3.transfer({
      senderAccount: account,
      intents: [
        {
          amount: 0.00000001,
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: bsNeo3.feeToken.hash,
          tokenDecimals: bsNeo3.feeToken.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it('Should be able to claim', async () => {
    const account = bsNeo3.generateAccountFromWif(process.env.TESTNET_PRIVATE_KEY as string)

    const maxTries = 10
    let tries = 0

    while (tries < maxTries) {
      try {
        const unclaimed = await bsNeo3.dataService.getUnclaimed(account.address)
        if (unclaimed <= 0) continue

        const transactionHash = await bsNeo3.claim(account)
        expect(transactionHash).toEqual(expect.any(String))
        break
      } catch (error) {
        await sleep(4000)
      } finally {
        tries++
      }
    }
  }, 60000)

  it('Should be able to get an owner of a domain', async () => {
    const owner = await bsNeo3.getOwnerOfNNS('neo.neo')
    expect(owner).toEqual('Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf')
  })
})
