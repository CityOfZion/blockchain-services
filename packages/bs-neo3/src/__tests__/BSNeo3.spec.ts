import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3 } from '../BSNeo3'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { BSKeychainHelper, isClaimable, type TBSNetwork } from '@cityofzion/blockchain-service'
import type { TBSNeo3NetworkId } from '../types'

let bsNeo3: BSNeo3<'test'>
let network: TBSNetwork<TBSNeo3NetworkId>

describe('BSNeo3', () => {
  beforeAll(() => {
    network = BSNeo3Constants.TESTNET_NETWORK
    bsNeo3 = new BSNeo3('test', network)
  })

  it('Should be able to claim', () => {
    expect(isClaimable(bsNeo3)).toBeTruthy()
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

  it('Should be able to generate an account from mnemonic', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await bsNeo3.generateAccountFromMnemonic(mnemonic, 0)

    expect(bsNeo3.validateAddress(account.address)).toBeTruthy()
    expect(bsNeo3.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate an account from wif', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await bsNeo3.generateAccountFromMnemonic(mnemonic, 0)

    const accountFromWif = await bsNeo3.generateAccountFromKey(account.key)
    expect(account).toEqual(expect.objectContaining(accountFromWif))
  })

  it('Should be able to decrypt a encrypted key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await bsNeo3.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeo3.encrypt(account.key, password)
    const decryptedAccount = await bsNeo3.decrypt(encryptedKey, password)
    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  })

  it('Should be able to encrypt a key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await bsNeo3.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeo3.encrypt(account.key, password)
    expect(encryptedKey).toEqual(expect.any(String))
  })

  it('Should be able to ping network', async () => {
    const response = await bsNeo3.pingNetwork(BSNeo3Constants.MAINNET_NETWORK.url)

    expect(response).toEqual({
      latency: expect.any(Number),
      url: BSNeo3Constants.MAINNET_NETWORK.url,
      height: expect.any(Number),
    })
  })

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          token: BSNeo3Constants.GAS_TOKEN,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer', async () => {
    const senderAccount = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const token = BSNeo3Constants.GAS_TOKEN
    const amount = '0.00000001'

    const transactions = await bsNeo3.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer with Ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSNeo3('test', network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const amount = '0.00000001'
    const token = BSNeo3Constants.GAS_TOKEN

    const transactions = await service.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token }],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to calculate the claim fee', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const fee = await bsNeo3.calculateClaimFee(account)

    expect(fee).toEqual(expect.stringMatching(/^0\.0\d*[1-9]$/))
  })

  it.skip('Should be able to claim', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const unclaimed = await bsNeo3.claimDataService.getUnclaimed(account.address)

    expect(Number(unclaimed)).toBeGreaterThan(0)

    const transaction = await bsNeo3.claim(account)

    expect(transaction).toEqual({
      txId: expect.any(String),
      txIdUrl: expect.any(String),
      date: expect.any(String),
      invocationCount: expect.any(Number),
      networkFeeAmount: expect.any(String),
      systemFeeAmount: expect.any(String),
      type: 'claim',
      view: 'default',
      events: [
        {
          eventType: 'token',
          amount: '0',
          methodName: 'transfer',
          from: account.address,
          fromUrl: expect.any(String),
          to: account.address,
          toUrl: expect.any(String),
          tokenType: 'nep-17',
          tokenUrl: expect.any(String),
          token: bsNeo3.burnToken,
        },
      ],
    })
  })

  it.skip('Should be able to calculate the claim fee with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeo3 = new BSNeo3('test', network, async () => transport)

    const account = await bsNeo3.ledgerService.getAccount(transport, 0)
    const fee = await bsNeo3.calculateClaimFee(account)

    expect(fee).toEqual(expect.stringMatching(/^0\.0\d*[1-9]$/))
  })

  it.skip('Should be able to claim with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeo3 = new BSNeo3('test', network, async () => transport)

    const account = await bsNeo3.ledgerService.getAccount(transport, 0)
    const unclaimed = await bsNeo3.claimDataService.getUnclaimed(account.address)

    expect(Number(unclaimed)).toBeGreaterThan(0)

    const transaction = await bsNeo3.claim(account)

    expect(transaction).toEqual({
      txId: expect.any(String),
      txIdUrl: expect.any(String),
      date: expect.any(String),
      invocationCount: expect.any(Number),
      networkFeeAmount: expect.any(String),
      systemFeeAmount: expect.any(String),
      type: 'claim',
      view: 'default',
      events: [
        {
          eventType: 'token',
          amount: '0',
          methodName: 'transfer',
          from: account.address,
          fromUrl: expect.any(String),
          to: account.address,
          toUrl: expect.any(String),
          tokenType: 'nep-17',
          tokenUrl: expect.any(String),
          token: bsNeo3.burnToken,
        },
      ],
    })
  })

  it('Should be able to resolve a name service domain', async () => {
    const owner = await bsNeo3.resolveNameServiceDomain('neo.neo')
    expect(owner).toEqual('Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf')
  })

  it.skip('Should be able to calculate transfer fee more than one intent', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          token: BSNeo3Constants.GAS_TOKEN,
        },
        {
          amount: '1',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          token: BSNeo3Constants.NEO_TOKEN,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    const senderAccount = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const gasToken = BSNeo3Constants.GAS_TOKEN
    const gasAmount = '0.00000001'
    const neoToken = BSNeo3Constants.NEO_TOKEN
    const neoAmount = '1'

    const transactions = await bsNeo3.transfer({
      senderAccount,
      intents: [
        {
          amount: gasAmount,
          receiverAddress: address,
          token: gasToken,
        },
        {
          amount: neoAmount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: gasAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token: gasToken,
          },
          {
            eventType: 'token',
            amount: neoAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer more than one intent with Ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSNeo3('test', network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const gasToken = BSNeo3Constants.GAS_TOKEN
    const gasAmount = '0.00000001'
    const neoToken = BSNeo3Constants.NEO_TOKEN
    const neoAmount = '1'

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: gasAmount,
          receiverAddress: address,
          token: gasToken,
        },
        {
          amount: neoAmount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: gasAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token: gasToken,
          },
          {
            eventType: 'token',
            amount: neoAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'nep-17',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  })
})
