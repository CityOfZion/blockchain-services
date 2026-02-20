import { BSKeychainHelper, type TBSToken } from '@cityofzion/blockchain-service'
import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

const mnemonic = process.env.TEST_MNEMONIC as string
const sacToken: TBSToken = {
  symbol: 'USDC',
  name: 'USDC',
  decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
  hash: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
}
let bsStellar: BSStellar<'test'>
let keypair: stellarSDK.Keypair
let keypair2: stellarSDK.Keypair

describe('BSStellar', () => {
  beforeAll(async () => {
    bsStellar = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK)

    const bip44Path = bsStellar.bip44DerivationPath.replace('?', '0')
    const key = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bip44Path)
    keypair = stellarSDK.Keypair.fromRawEd25519Seed(key)

    const bip44Path2 = bsStellar.bip44DerivationPath.replace('?', '1')
    const key2 = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bip44Path2)
    keypair2 = stellarSDK.Keypair.fromRawEd25519Seed(key2)
  })

  it('Should be able to validate an address', () => {
    const validAddress = keypair.publicKey()
    const invalidAddress = 'invalid address'
    const anotherInvalidAddress = '0x0000000000000000000000000000000000000000'

    expect(bsStellar.validateAddress(validAddress)).toBeTruthy()
    expect(bsStellar.validateAddress(invalidAddress)).toBeFalsy()
    expect(bsStellar.validateAddress(anotherInvalidAddress)).toBeFalsy()
  })

  it('Should be able to validate a key', () => {
    const validKey = keypair.secret()
    const invalidKey = 'invalid key'
    const anotherInvalidKey = '3213, 21, 2, 23, 211'

    expect(bsStellar.validateKey(validKey)).toBeTruthy()
    expect(bsStellar.validateKey(invalidKey)).toBeFalsy()
    expect(bsStellar.validateKey(anotherInvalidKey)).toBeFalsy()
  })

  it('Should be able to generate a account from mnemonic', async () => {
    const generatedAccount = await bsStellar.generateAccountFromMnemonic(mnemonic, 0)

    expect(generatedAccount.address).toEqual(keypair.publicKey())
    expect(generatedAccount.key).toEqual(keypair.secret())
  })

  it('Should be able to generate a account from key', async () => {
    const secret = keypair.secret()
    const generatedAccount = await bsStellar.generateAccountFromKey(secret)

    expect(generatedAccount.address).toEqual(keypair.publicKey())
    expect(generatedAccount.key).toEqual(keypair.secret())
  })

  it('Should be able to ping a node', async () => {
    const response = await bsStellar.pingNode(BSStellarConstants.MAINNET_NETWORK.url)
    expect(response).toEqual({
      latency: expect.any(Number),
      url: BSStellarConstants.MAINNET_NETWORK.url,
      height: expect.any(Number),
    })
  })

  it('Should be able to calculate transfer fee', async () => {
    const senderAccount = await bsStellar.generateAccountFromKey(keypair.secret())

    const fee = await bsStellar.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: keypair.publicKey(),
          token: BSStellarConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: keypair.publicKey(),
          token: sacToken,
        },
      ],
    })

    expect(fee).toEqual('0.0000200')
  })

  // Fetch https://friendbot.stellar.org?addr=${address} to fund test accounts
  it.skip('Should be able to transfer the native token', async () => {
    const senderAccount = await bsStellar.generateAccountFromKey(keypair.secret())

    const [transactionHash] = await bsStellar.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.0000001',
          receiverAddress: keypair2.publicKey(),
          token: BSStellarConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    const senderAccount = await bsStellar.generateAccountFromKey(keypair.secret())
    const receiverAccount = await bsStellar.generateAccountFromKey(keypair2.secret())

    // Uncomment to create the trustline first
    // const createTrustlineTransactionHash = await service._createTrustline(receiverAccount, sacToken)
    // console.log('Trustline created:', createTrustlineTransactionHash)
    // await BSUtilsHelper.wait(5000) // Wait for the trustline to be processed

    const [transactionHash] = await bsStellar.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.0000001',
          receiverAddress: receiverAccount.address,
          token: BSStellarConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.0000001',
          receiverAddress: receiverAccount.address,
          token: sacToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to calculate transfer fee using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: BSStellarConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          token: sacToken,
        },
      ],
    })

    expect(fee).toEqual('0.0000200')
  })

  it.skip('Should be able to transfer the native token using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.0000001',
          receiverAddress: receiverAccount.address,
          token: BSStellarConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    // Uncomment to create the trustline first
    // const createTrustlineTransactionHash = await service._createTrustline(receiverAccount, sacToken)
    // console.log('Trustline created:', createTrustlineTransactionHash)
    // await BSUtilsHelper.wait(5000) // Wait for the trustline to be processed

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.0000001',
          receiverAddress: receiverAccount.address,
          token: BSStellarConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.0000001',
          receiverAddress: receiverAccount.address,
          token: sacToken,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })
})
