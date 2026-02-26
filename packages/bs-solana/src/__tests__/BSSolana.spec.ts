import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSKeychainHelper, BSUtilsHelper } from '@cityofzion/blockchain-service'
import * as solanaKit from '@solana/kit'

const mnemonic = process.env.TEST_MNEMONIC as string
let accountKeypair: { base58Key: string; base58Address: string }
let bsSolana: BSSolana<'test'>

const splToken = {
  hash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  name: 'Test SPL Token',
  symbol: 'TST',
  decimals: 6,
}

describe('BSSolana', () => {
  beforeEach(async () => {
    bsSolana = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  beforeAll(async () => {
    const bip44Path = BSKeychainHelper.getBipPath(BSSolanaConstants.DEFAULT_BIP44_DERIVATION_PATH, 0)
    const keyBuffer = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bip44Path)
    const signer = await solanaKit.createKeyPairSignerFromPrivateKeyBytes(keyBuffer)
    const publicKeyBytes = solanaKit.getBase58Encoder().encode(signer.address)
    const secretKey64 = new Uint8Array(64)

    secretKey64.set(keyBuffer, 0)
    secretKey64.set(publicKeyBytes, 32)

    const base58Key = solanaKit.getBase58Decoder().decode(secretKey64)

    accountKeypair = {
      base58Key,
      base58Address: signer.address,
    }
  })

  it('Should be able to validate an address', () => {
    const validAddress = accountKeypair.base58Address
    const invalidAddress = 'invalid address'
    const anotherInvalidAddress = '0x0000000000000000000000000000000000000000'

    expect(bsSolana.validateAddress(validAddress)).toBeTruthy()
    expect(bsSolana.validateAddress(invalidAddress)).toBeFalsy()
    expect(bsSolana.validateAddress(anotherInvalidAddress)).toBeFalsy()
  })

  it('Should be able to validate a key', () => {
    const validKey = accountKeypair.base58Key
    const invalidKey = 'invalid key'

    expect(bsSolana.validateKey(validKey)).toBeTruthy()
    expect(bsSolana.validateKey(invalidKey)).toBeFalsy()
  })

  it('Should be able to generate an account from mnemonic', async () => {
    const generatedAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 0)

    expect(generatedAccount.address).toEqual(accountKeypair.base58Address)
    expect(generatedAccount.key).toEqual(accountKeypair.base58Key)
  })

  it('Should be able to generate an account from key', async () => {
    const generatedAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    expect(generatedAccount.address).toEqual(accountKeypair.base58Address)
    expect(generatedAccount.key).toEqual(accountKeypair.base58Key)
  })

  it('Should be able to ping network', async () => {
    const response = await bsSolana.pingNetwork(BSSolanaConstants.MAINNET_NETWORK.url)

    expect(response).toEqual({
      latency: expect.any(Number),
      url: BSSolanaConstants.MAINNET_NETWORK.url,
      height: expect.any(Number),
    })
  })

  it('Should be able to calculate transfer fee of the native token', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: accountKeypair.base58Address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it('Should be able to calculate transfer fee of a SPL token', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    const receiverAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it('Should be able to calculate transfer fee for more than one intent', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to transfer the native token', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer a SPL token', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer more than one intent', async () => {
    const senderAccount = await bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = await bsSolana.generateAccountFromMnemonic(mnemonic, 2)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it('Should be able to validate an domain', () => {
    const validDomain = 'bonfida.sol'
    const invalidDomain = 'invalid domain'

    expect(bsSolana.validateNameServiceDomainFormat(validDomain)).toBeTruthy()
    expect(bsSolana.validateNameServiceDomainFormat(invalidDomain)).toBeFalsy()
  })

  it('Should be able to resolve a name service domain', async () => {
    const newBSSolana = new BSSolana('test', BSSolanaConstants.MAINNET_NETWORK)
    const address = await newBSSolana.resolveNameServiceDomain('bonfida.sol')
    expect(address).toEqual('Fw1ETanDZafof7xEULsnq9UY6o71Tpds89tNwPkWLb1v')
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to calculate transfer fee for more than one intent using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer the native token using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer a SPL token using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer more than one intent using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSSolanaConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: splToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })
})
