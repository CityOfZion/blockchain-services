import { BSKeychainHelper, BSUtilsHelper, type TBSToken } from '@cityofzion/blockchain-service'
import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

const mnemonic = process.env.TEST_MNEMONIC

// USDC faucet: https://faucet.circle.com
const sacToken: TBSToken = {
  symbol: 'USDC',
  name: 'USDC',
  decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
  hash: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
}
let bsStellar: BSStellar
let keypair: stellarSDK.Keypair
let keypair2: stellarSDK.Keypair

describe('BSStellar', () => {
  beforeAll(async () => {
    bsStellar = new BSStellar(BSStellarConstants.TESTNET_NETWORK)

    const bipPath = BSKeychainHelper.getBipPath(bsStellar.bipDerivationPath, 0)
    const key = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bipPath)
    keypair = stellarSDK.Keypair.fromRawEd25519Seed(key)

    const bipPath2 = BSKeychainHelper.getBipPath(bsStellar.bipDerivationPath, 1)
    const key2 = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bipPath2)
    keypair2 = stellarSDK.Keypair.fromRawEd25519Seed(key2)

    // Avoid hitting rate limits in tests
    await BSUtilsHelper.wait(500)
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

  it('Should be able to generate an account from mnemonic', async () => {
    const generatedAccount = await bsStellar.generateAccountFromMnemonic(mnemonic, 0)

    expect(generatedAccount.address).toEqual(keypair.publicKey())
    expect(generatedAccount.key).toEqual(keypair.secret())
  })

  it('Should be able to generate an account from key', async () => {
    const secret = keypair.secret()
    const generatedAccount = await bsStellar.generateAccountFromKey(secret)

    expect(generatedAccount.address).toEqual(keypair.publicKey())
    expect(generatedAccount.key).toEqual(keypair.secret())
  })

  it('Should be able to ping network', async () => {
    const response = await bsStellar.pingNetwork(BSStellarConstants.MAINNET_NETWORK.url)

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

    expect(fee).toEqual('0.00002')
  })

  // Fetch https://friendbot.stellar.org?addr=${address} to fund test accounts
  it.skip('Should be able to transfer the native token', async () => {
    const senderAccount = await bsStellar.generateAccountFromKey(keypair.secret())
    const amount = '0.0000001'
    const receiverAddress = keypair2.publicKey()
    const token = BSStellarConstants.NATIVE_TOKEN

    const transactions = await bsStellar.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress, token }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    const senderAccount = await bsStellar.generateAccountFromKey(keypair.secret())
    const receiverAccount = await bsStellar.generateAccountFromKey(keypair2.secret())
    const amount = '0.0000001'
    const receiverAddress = receiverAccount.address
    const token = BSStellarConstants.NATIVE_TOKEN

    // Uncomment to create the trustlines
    // const trustlineSender = await service.createTrustline(senderAccount, sacToken)
    // console.log(`Trustline sender: ${trustlineSender}`)
    // const trustlineReceiver = await service.createTrustline(receiverAccount, sacToken)
    // console.log(`Trustline receiver: ${trustlineReceiver}`)
    // await BSUtilsHelper.wait(10000) // Wait for the trustline to be processed

    const transactions = await bsStellar.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress,
          token,
        },
        {
          amount,
          receiverAddress,
          token: sacToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: undefined,
            token,
          },
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: expect.any(String),
            token: sacToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to calculate transfer fee using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar(BSStellarConstants.TESTNET_NETWORK, async () => transport)
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

    expect(fee).toEqual('0.00002')
  })

  it.skip('Should be able to transfer the native token using Ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar(BSStellarConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)
    const receiverAddress = receiverAccount.address
    const token = BSStellarConstants.NATIVE_TOKEN
    const amount = '0.0000001'

    const transactions = await service.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress, token }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer more than one intent using Ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSStellar(BSStellarConstants.TESTNET_NETWORK, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)
    const amount = '0.0000001'
    const receiverAddress = receiverAccount.address
    const token = BSStellarConstants.NATIVE_TOKEN

    // Uncomment to create the trustlines
    // const trustlineSender = await service.createTrustline(senderAccount, sacToken)
    // console.log(`Trustline sender: ${trustlineSender}`)
    // const trustlineReceiver = await service.createTrustline(receiverAccount, sacToken)
    // console.log(`Trustline receiver: ${trustlineReceiver}`)
    // await BSUtilsHelper.wait(10000) // Wait for the trustline to be processed

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress,
          token,
        },
        {
          amount,
          receiverAddress,
          token: sacToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: undefined,
            token,
          },
          {
            eventType: 'token',
            amount,
            methodName: 'payment',
            from: senderAccount.address,
            fromUrl: expect.any(String),
            to: receiverAddress,
            toUrl: expect.any(String),
            tokenUrl: expect.any(String),
            token: sacToken,
          },
        ],
      },
    ])
  })
})
