import { BSNeo3 } from '../BSNeo3'
import { generateMnemonic } from '@cityofzion/bs-asteroid-sdk'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { Network } from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId, BSNeo3Helper } from '../BSNeo3Helper'

let bsNeo3: BSNeo3
let network: Network<BSNeo3NetworkId>

describe('BSNeo3', () => {
  beforeAll(async () => {
    network = BSNeo3Helper.TESTNET_NETWORKS[0]
    bsNeo3 = new BSNeo3('neo3', network)
  }, 60000)

  it('Should be able to validate an address', () => {
    const validAddress = 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe'
    const invalidAddress = 'invalid address'

    expect(bsNeo3.validateAddress(validAddress)).toBeTruthy()
    expect(bsNeo3.validateAddress(invalidAddress)).toBeFalsy()
  })

  it('Should be able to validate an encrypted key', () => {
    const validEncryptedKey = '6PYVPVe1fQznphjbUxXP9KZJqPMVnVwCx5s5pr5axRJ8uHkMtZg97eT5kL'
    const invalidEncryptedKey = 'invalid encrypted key'

    expect(bsNeo3.validateEncrypted(validEncryptedKey)).toBeTruthy()
    expect(bsNeo3.validateEncrypted(invalidEncryptedKey)).toBeFalsy()
  })

  it('Should be able to validate a wif', () => {
    const validWif = 'L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP'
    const invalidWif = 'invalid wif'

    expect(bsNeo3.validateKey(validWif)).toBeTruthy()
    expect(bsNeo3.validateKey(invalidWif)).toBeFalsy()
  })

  it('Should be able to validate an domain', () => {
    const validDomain = 'test.neo'
    const invalidDomain = 'invalid domain'

    expect(bsNeo3.validateNameServiceDomainFormat(validDomain)).toBeTruthy()
    expect(bsNeo3.validateNameServiceDomainFormat(invalidDomain)).toBeFalsy()
  })

  it('Should be able to generate a mnemonic', () => {
    expect(() => {
      const mnemonic = generateMnemonic()
      expect(mnemonic).toHaveLength(12)
    }).not.toThrowError()
  })

  it('Should be able to gererate a account from mnemonic', () => {
    const mnemonic = generateMnemonic()
    const account = bsNeo3.generateAccountFromMnemonic(mnemonic, 0)

    expect(bsNeo3.validateAddress(account.address)).toBeTruthy()
    expect(bsNeo3.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate a account from wif', () => {
    const mnemonic = generateMnemonic()
    const account = bsNeo3.generateAccountFromMnemonic(mnemonic, 0)

    const accountFromWif = bsNeo3.generateAccountFromKey(account.key)
    expect(account).toEqual(expect.objectContaining(accountFromWif))
  })

  it('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = generateMnemonic()
    const account = bsNeo3.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeo3.encrypt(account.key, password)
    const decryptedAccount = await bsNeo3.decrypt(encryptedKey, password)
    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  }, 20000)

  it('Should be able to encrypt a key', async () => {
    const mnemonic = generateMnemonic()
    const account = bsNeo3.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeo3.encrypt(account.key, password)
    expect(encryptedKey).toEqual(expect.any(String))
  })

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TESTNET_PRIVATE_KEY as string)

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intent: {
        amount: '0.00000001',
        receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
        tokenHash: bsNeo3.feeToken.hash,
        tokenDecimals: bsNeo3.feeToken.decimals,
      },
    })

    expect(fee).toEqual({
      total: expect.any(Number),
      networkFee: expect.any(Number),
      systemFee: expect.any(Number),
    })
  })

  it.skip('Should be able to transfer', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TESTNET_PRIVATE_KEY as string)
    const balance = await bsNeo3.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === bsNeo3.feeToken.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const transactionHash = await bsNeo3.transfer({
      senderAccount: account,
      intent: {
        amount: '0.00000001',
        receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
        tokenHash: bsNeo3.feeToken.hash,
        tokenDecimals: bsNeo3.feeToken.decimals,
      },
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer with ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSNeo3('neo3', network, async () => transport)

    const publicKey = await service.ledgerService.getPublicKey(transport)

    const account = service.generateAccountFromPublicKey(publicKey)

    const balance = await service.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === service.feeToken.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const transactionHash = await service.transfer({
      senderAccount: account,
      intent: {
        amount: '1',
        receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
        tokenHash: service.feeToken.hash,
        tokenDecimals: service.feeToken.decimals,
      },
      isLedger: true,
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 60000)

  it.skip('Should be able to claim', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TESTNET_PRIVATE_KEY as string)

    const unclaimed = await bsNeo3.blockchainDataService.getUnclaimed(account.address)
    expect(Number(unclaimed)).toBeGreaterThan(0)
    const transactionHash = await bsNeo3.claim(account)
    expect(transactionHash).toEqual(expect.any(String))
  }, 60000)

  it('Should be able to resolve a name service domain', async () => {
    const owner = await bsNeo3.resolveNameServiceDomain('neo.neo')
    expect(owner).toEqual('Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf')
  })
})
