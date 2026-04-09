import { ethers } from 'ethers'
import { BSEthereum } from '../BSEthereum'
import type { TBSAccount, TBSToken } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'

let bsEthereum: BSEthereum<'ethereum'>
let wallet: ethers.Wallet
let account: TBSAccount<'ethereum'>
let nativeToken: TBSToken

// Faucet: https://faucet.circle.com/
const usdcToken: TBSToken = {
  name: 'USDC',
  symbol: 'USDC',
  decimals: 6,
  hash: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
}

describe('BSEthereum', () => {
  beforeEach(async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.ethereum.find(network => network.type === 'testnet')!

    bsEthereum = new BSEthereum('ethereum', network)
    wallet = ethers.Wallet.createRandom()

    account = {
      key: wallet.privateKey,
      type: 'privateKey',
      address: wallet.address,
      blockchain: 'ethereum',
    }

    nativeToken = BSEthereumHelper.getNativeAsset(network)
  })

  it('Should be able to validate an address', () => {
    const validAddress = '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5'
    const invalidAddress = 'invalid address'

    expect(bsEthereum.validateAddress(validAddress)).toBeTruthy()
    expect(bsEthereum.validateAddress(invalidAddress)).toBeFalsy()
  })

  it('Should be able to validate an encrypted key', async () => {
    const validEncryptedJson = await wallet.encrypt('password')
    const invalidEncryptedJson = '{ invalid: json }'

    expect(bsEthereum.validateEncrypted(validEncryptedJson)).toBeTruthy()
    expect(bsEthereum.validateEncrypted(invalidEncryptedJson)).toBeFalsy()
  })

  it('Should be able to validate a private key', () => {
    const validKey = wallet.privateKey
    const invalidKey = 'invalid key'

    expect(bsEthereum.validateKey(validKey)).toBeTruthy()
    expect(bsEthereum.validateKey(invalidKey)).toBeFalsy()
  })

  it('Should be able to validate an domain', () => {
    const validDomain = 'alice.eth'
    const invalidDomain = 'invalid domain'

    expect(bsEthereum.validateNameServiceDomainFormat(validDomain)).toBeTruthy()
    expect(bsEthereum.validateNameServiceDomainFormat(invalidDomain)).toBeFalsy()
  })

  it('Should be able to generate an account from mnemonic', async () => {
    const account = await bsEthereum.generateAccountFromMnemonic(wallet.mnemonic.phrase, 0)

    expect(bsEthereum.validateAddress(account.address)).toBeTruthy()
    expect(bsEthereum.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate an account from wif', async () => {
    const accountFromWif = await bsEthereum.generateAccountFromKey(wallet.privateKey)
    expect(accountFromWif).toEqual(account)
  })

  it('Should be able to decrypt a encrypted key', async () => {
    const password = 'TestPassword'
    const validEncryptedJson = await bsEthereum.encrypt(wallet.privateKey, password)
    const decryptedAccount = await bsEthereum.decrypt(validEncryptedJson, password)
    expect(decryptedAccount).toEqual(account)
  })

  it('Should be able to encrypt key', async () => {
    const password = 'TestPassword'
    const validEncryptedJson = await bsEthereum.encrypt(wallet.privateKey, password)
    expect(JSON.parse(validEncryptedJson)).toEqual(
      expect.objectContaining({ address: wallet.address.replace('0x', '').toLowerCase() })
    )
  })

  it('Should be able to ping network', async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.ethereum.find(net => net.type === 'mainnet')!
    const response = await bsEthereum.pingNetwork(network.url)

    expect(response).toEqual({
      latency: expect.any(Number),
      url: network.url,
      height: expect.any(Number),
    })
  })

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = await bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsEthereum.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          token: usdcToken,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer a native token using Testnet', async () => {
    const senderAccount = await bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.00000001'

    const transactions = await bsEthereum.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token: nativeToken }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            token: nativeToken,
            tokenUrl: undefined,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer an ERC-20 token using Testnet', async () => {
    const senderAccount = await bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.00001'

    const transactions = await bsEthereum.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token: usdcToken }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            tokenUrl: expect.any(String),
            token: usdcToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer a native token with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSEthereum('ethereum', bsEthereum.network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const amount = '0.00000001'

    const transactions = await service.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token: nativeToken }],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            tokenUrl: undefined,
            token: nativeToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer an ERC-20 token with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSEthereum('ethereum', bsEthereum.network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const amount = '0.000001'

    const transactions = await service.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token: usdcToken }],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            tokenUrl: expect.any(String),
            token: usdcToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to resolve a name service domain', async () => {
    const address = await bsEthereum.resolveNameServiceDomain('alice.eth')
    expect(address).toEqual('0xa974890156A3649A23a6C0f2ebd77D6F7A7333d4')
  })

  it.skip('Should be able to transfer a native token using an EVM using Testnet', async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.polygon.find(network => network.id === '80002')! // Amoy network
    const service = new BSEthereum('polygon', network)
    const senderAccount = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.000001'
    const token = service.nativeTokens[0]

    const transactions = await service.transfer({
      senderAccount,
      intents: [{ amount, receiverAddress: address, token }],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: undefined,
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: undefined,
            to: address,
            toUrl: undefined,
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to calculate transfer fee for more than one intent', async () => {
    const account = await bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsEthereum.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          token: nativeToken,
        },
        {
          amount: '0.00000001',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          token: nativeToken,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent using Testnet', async () => {
    const senderAccount = await bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.00000001'

    const transactions = await bsEthereum.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: address,
          token: nativeToken,
        },
        {
          amount,
          receiverAddress: address,
          token: nativeToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            tokenUrl: undefined,
            token: nativeToken,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        blockchain: 'ethereum',
        isPending: true,
        relatedAddress: address,
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
            tokenUrl: undefined,
            token: nativeToken,
          },
        ],
      },
    ])
  })
})
