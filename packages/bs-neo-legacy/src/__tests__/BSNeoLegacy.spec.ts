import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSKeychainHelper, isClaimable } from '@cityofzion/blockchain-service'

let service: BSNeoLegacy<'test'>

const network = BSNeoLegacyConstants.TESTNET_NETWORK

describe('BSNeoLegacy', () => {
  beforeEach(() => {
    service = new BSNeoLegacy('test', network)
  })

  it('Should be able to claim', () => {
    expect(isClaimable(service)).toBeTruthy()
  })

  it('Should be able to validate an address', () => {
    const validAddress = 'AJDZ8QP7ydjFicpcXCkG7wczeWEAKxpF69'
    const invalidAddress = 'invalid address'

    expect(service.validateAddress(validAddress)).toBeTruthy()
    expect(service.validateAddress(invalidAddress)).toBeFalsy()
  })

  it('Should be able to validate an encrypted key', () => {
    const validEncryptedKey = '6PYSsRjFn1v5uu79h5vXGZEYvvRkioHmd1Fd5bUyVp9Gt2wJcLKWHgD6Hy'
    const invalidEncryptedKey = 'invalid encrypted key'

    expect(service.validateEncrypted(validEncryptedKey)).toBeTruthy()
    expect(service.validateEncrypted(invalidEncryptedKey)).toBeFalsy()
  })

  it('Should be able to validate a wif', () => {
    const validWif = 'L4ZnhLegkFV9FTys1wBJDHUykn5hLnr15cPqvfuy4E1kzWTE6iRM'
    const invalidWif = 'invalid wif'

    expect(service.validateKey(validWif)).toBeTruthy()
    expect(service.validateKey(invalidWif)).toBeFalsy()
  })

  it('Should be able to generate an account from mnemonic', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)

    expect(service.validateAddress(account.address)).toBeTruthy()
    expect(service.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate an account from wif', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)

    const accountFromWif = await service.generateAccountFromKey(account.key)
    expect(account).toEqual(expect.objectContaining(accountFromWif))
  })

  it.skip('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await service.encrypt(account.key, password)
    const decryptedAccount = await service.decrypt(encryptedKey, password)
    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  })

  it('Should be able to encrypt a key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await service.encrypt(account.key, password)
    expect(encryptedKey).toEqual(expect.any(String))
  })

  it.skip('Should be able to ping network', async () => {
    const response = await service.pingNetwork(BSNeoLegacyConstants.MAINNET_NETWORK.url)

    expect(response).toEqual({
      latency: expect.any(Number),
      url: BSNeoLegacyConstants.MAINNET_NETWORK.url,
      height: expect.any(Number),
    })
  })

  it.skip('Should be able to transfer a native asset', async () => {
    const account = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await service.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === 'GAS')!
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          token: gasBalance.token,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a nep5 asset', async () => {
    const account = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await service.blockchainDataService.getBalance(account.address)
    const LXBalance = balance.find(item => item.token.symbol === 'LX')!
    expect(Number(LXBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          token: LXBalance.token,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    service.setNetwork(BSNeoLegacyConstants.MAINNET_NETWORK)
    const account = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await service.blockchainDataService.getBalance(account.address)

    const LXBalance = balance.find(item => item.token.symbol === 'LX')!
    expect(Number(LXBalance?.amount)).toBeGreaterThan(0.00000002)

    const gasBalance = balance.find(item => item.token.symbol === service.feeToken.symbol)!
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          token: LXBalance.token,
        },
        {
          amount: '0.00000001',
          receiverAddress: 'AJybR5Uhwvs7WqGaruQ38dkyZkaKG9tyDK',
          token: LXBalance.token,
        },
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          token: gasBalance.token,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer with ledger', async () => {
    const transport = await TransportNodeHid.create()

    const service = new BSNeoLegacy('test', undefined, async () => transport)

    const account = await service.ledgerService.getAccount(transport, 0)

    const balance = await service.blockchainDataService.getBalance(account.address)

    const gasBalance = balance.find(b => b.token.symbol === service.feeToken.symbol)

    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'Ac9hjKxteW3BvDyrhTxizkUxEShT8B4DaU',
          token: gasBalance!.token,
        },
      ],
    })
    transport.close()

    expect(transactionHash).toEqual(expect.any(String))
  })
})
