import { generateMnemonic } from '@cityofzion/bs-asteroid-sdk'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../constants/BSNeoLegacyConstants'
import { Network } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeoLegacy } from '../BSNeoLegacy'

let bsNeoLegacy: BSNeoLegacy<'neoLegacy'>

const network: Network<BSNeoLegacyNetworkId> = BSNeoLegacyConstants.DEFAULT_NETWORK
describe('BSNeoLegacy', () => {
  beforeEach(() => {
    bsNeoLegacy = new BSNeoLegacy('neoLegacy', network)
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

    expect(bsNeoLegacy.validateEncrypted(validEncryptedKey)).toBeTruthy()
    expect(bsNeoLegacy.validateEncrypted(invalidEncryptedKey)).toBeFalsy()
  })

  it('Should be able to validate a wif', () => {
    const validWif = 'L4ZnhLegkFV9FTys1wBJDHUykn5hLnr15cPqvfuy4E1kzWTE6iRM'
    const invalidWif = 'invalid wif'

    expect(bsNeoLegacy.validateKey(validWif)).toBeTruthy()
    expect(bsNeoLegacy.validateKey(invalidWif)).toBeFalsy()
  })

  it('Should be able to generate a account from mnemonic', () => {
    const mnemonic = generateMnemonic()
    const account = bsNeoLegacy.generateAccountFromMnemonic(mnemonic, 0)

    expect(bsNeoLegacy.validateAddress(account.address)).toBeTruthy()
    expect(bsNeoLegacy.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate a account from wif', () => {
    const mnemonic = generateMnemonic()
    const account = bsNeoLegacy.generateAccountFromMnemonic(mnemonic, 0)

    const accountFromWif = bsNeoLegacy.generateAccountFromKey(account.key)
    expect(account).toEqual(expect.objectContaining(accountFromWif))
  })

  it.skip('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = generateMnemonic()
    const account = bsNeoLegacy.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeoLegacy.encrypt(account.key, password)
    const decryptedAccount = await bsNeoLegacy.decrypt(encryptedKey, password)
    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  }, 60000)

  it('Should be able to encrypt a key', async () => {
    const mnemonic = generateMnemonic()
    const account = bsNeoLegacy.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeoLegacy.encrypt(account.key, password)
    expect(encryptedKey).toEqual(expect.any(String))
  }, 60000)

  it('Should be able to test the network', async () => {
    expect(() => bsNeoLegacy.testNetwork(network)).not.toThrowError()
  })

  it.skip('Should be able to transfer a native asset', async () => {
    const account = bsNeoLegacy.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeoLegacy.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === 'GAS')!
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          tokenHash: gasBalance.token.hash,
          tokenDecimals: gasBalance.token.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a nep5 asset', async () => {
    const account = bsNeoLegacy.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeoLegacy.blockchainDataService.getBalance(account.address)
    const LXBalance = balance.find(item => item.token.symbol === 'LX')!
    expect(Number(LXBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          tokenHash: LXBalance.token.hash,
          tokenDecimals: LXBalance.token.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a asset with tip', async () => {
    bsNeoLegacy.setNetwork(BSNeoLegacyConstants.DEFAULT_NETWORK)
    const account = bsNeoLegacy.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeoLegacy.blockchainDataService.getBalance(account.address)
    const LXBalance = balance.find(item => item.token.symbol === 'LX')!
    expect(Number(LXBalance?.amount)).toBeGreaterThan(0.00000001)
    const gasBalance = balance.find(item => item.token.symbol === bsNeoLegacy.feeToken.symbol)!
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: LXBalance.token.hash,
          tokenDecimals: LXBalance.token.decimals,
        },
      ],
      tipIntent: {
        amount: '0.00000001',
        receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
        tokenHash: gasBalance.token.hash,
        tokenDecimals: gasBalance.token.decimals,
      },
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    bsNeoLegacy.setNetwork(BSNeoLegacyConstants.DEFAULT_NETWORK)
    const account = bsNeoLegacy.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeoLegacy.blockchainDataService.getBalance(account.address)

    const LXBalance = balance.find(item => item.token.symbol === 'LX')!
    expect(Number(LXBalance?.amount)).toBeGreaterThan(0.00000002)

    const gasBalance = balance.find(item => item.token.symbol === bsNeoLegacy.feeToken.symbol)!
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await bsNeoLegacy.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'AQEQdmCcitFbE6oJU5Epa7dNxhTkCmTZST',
          tokenHash: LXBalance.token.hash,
          tokenDecimals: LXBalance.token.decimals,
        },
        {
          amount: '0.00000001',
          receiverAddress: 'AJybR5Uhwvs7WqGaruQ38dkyZkaKG9tyDK',
          tokenHash: LXBalance.token.hash,
          tokenDecimals: LXBalance.token.decimals,
        },
        {
          amount: '0.00000001',
          receiverAddress: account.address,
          tokenHash: gasBalance.token.hash,
          tokenDecimals: gasBalance.token.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer with ledger', async () => {
    const transport = await TransportNodeHid.create()

    const service = new BSNeoLegacy('neoLegacy', undefined, async () => transport)

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
          tokenHash: service.feeToken.hash,
          tokenDecimals: service.feeToken.decimals,
        },
      ],
    })
    transport.close()

    expect(transactionHash).toEqual(expect.any(String))
  }, 60000)
})
