import { ethers } from 'ethers'
import { BSEthereum } from '../BSEthereum'
import type { TBSAccount, TBSToken } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'

let bsEthereum: BSEthereum<'ethereum'>
let wallet: ethers.HDNodeWallet
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
    const account = await bsEthereum.generateAccountFromMnemonic(wallet.mnemonic!.phrase, 0)

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

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
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

  it('Should throw when transferring with a memo', async () => {
    await expect(
      bsEthereum.transfer({
        senderAccount: account,
        intents: [{ amount: '1', receiverAddress: account.address, token: nativeToken }],
        memo: 'memo',
      })
    ).rejects.toMatchObject({ code: 'MEMO_NOT_SUPPORTED' })
  })

  it('Should keep the transaction payload gas params when they are higher than the network ones', async () => {
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getFeeData').mockResolvedValue({
      gasPrice: 1000000000n,
      maxFeePerGas: 1500000000n,
      maxPriorityFeePerGas: 500000000n,
    } as ethers.FeeData)

    const estimateGas = vi.fn().mockResolvedValue(20000n)
    const sendTransaction = vi.fn().mockResolvedValue({ hash: '0xpayloadtx' })

    vi.spyOn(bsEthereum, '_getSigner').mockResolvedValue({ estimateGas, sendTransaction } as any)

    const transaction = await bsEthereum.sendTransactionPayload({
      senderAccount: account,
      payload: {
        to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        data: '0x1234',
        value: '1000',
        gasLimit: '21000',
        maxFeePerGas: '2000000000',
        maxPriorityFeePerGas: '1000000000',
        chainId: bsEthereum.network.id,
      },
    })

    expect(sendTransaction).toHaveBeenCalledWith({
      chainId: parseInt(bsEthereum.network.id),
      to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
      data: '0x1234',
      value: '1000',
      type: 2,
      gasLimit: '21000',
      maxFeePerGas: '2000000000',
      maxPriorityFeePerGas: '1000000000',
    })

    expect(transaction).toEqual({
      blockchain: 'ethereum',
      isPending: true,
      relatedAddress: account.address,
      txId: '0xpayloadtx',
      txIdUrl: bsEthereum.explorerService.buildTransactionUrl('0xpayloadtx'),
      date: expect.any(String),
      networkFeeAmount: '0.000042',
      view: 'default',
      events: [],
    })
  })

  it('Should use the network gas params when the transaction payload ones are stale', async () => {
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getFeeData').mockResolvedValue({
      gasPrice: 3000000000n,
      maxFeePerGas: 5000000000n,
      maxPriorityFeePerGas: 1500000000n,
    } as ethers.FeeData)

    const estimateGas = vi.fn().mockResolvedValue(60000n)
    const sendTransaction = vi.fn().mockResolvedValue({ hash: '0xpayloadtx' })

    vi.spyOn(bsEthereum, '_getSigner').mockResolvedValue({ estimateGas, sendTransaction } as any)

    await bsEthereum.sendTransactionPayload({
      senderAccount: account,
      payload: {
        to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        data: '0x1234',
        gasLimit: '0xc350',
        gasPrice: '0x3b9aca00',
      },
    })

    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 2,
        gasLimit: '60000',
        maxFeePerGas: '5000000000',
        maxPriorityFeePerGas: '1500000000',
      })
    )
  })

  it('Should use the legacy gas price when the network does not support EIP-1559', async () => {
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getFeeData').mockResolvedValue({
      gasPrice: 1000000000n,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
    } as ethers.FeeData)

    const estimateGas = vi.fn().mockRejectedValue(new Error('estimate failed'))
    const sendTransaction = vi.fn().mockResolvedValue({ hash: '0xpayloadtx' })

    vi.spyOn(bsEthereum, '_getSigner').mockResolvedValue({ estimateGas, sendTransaction } as any)

    const transaction = await bsEthereum.sendTransactionPayload({
      senderAccount: account,
      payload: { to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5', data: '0x1234', gasLimit: '50000' },
    })

    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 0, gasLimit: '50000', gasPrice: '1000000000' })
    )
    expect(transaction.networkFeeAmount).toBe('0.00005')
  })

  it('Should throw instead of sending when the gas estimation fails and the payload has no gas limit', async () => {
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getFeeData').mockResolvedValue({
      gasPrice: 1000000000n,
      maxFeePerGas: 2000000000n,
      maxPriorityFeePerGas: 1000000000n,
    } as ethers.FeeData)

    const estimateGas = vi.fn().mockRejectedValue(new Error('execution reverted'))
    const sendTransaction = vi.fn()

    vi.spyOn(bsEthereum, '_getSigner').mockResolvedValue({ estimateGas, sendTransaction } as any)

    await expect(
      bsEthereum.sendTransactionPayload({
        senderAccount: account,
        payload: { to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5', data: '0x1234' },
      })
    ).rejects.toMatchObject({ code: 'GAS_ESTIMATION_FAILED' })
    expect(sendTransaction).not.toHaveBeenCalled()
  })

  it('Should throw when the transaction payload chain ID does not match the network', async () => {
    await expect(
      bsEthereum.sendTransactionPayload({
        senderAccount: account,
        payload: { to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5', data: '0x1234', chainId: '137' },
      })
    ).rejects.toMatchObject({ code: 'CHAIN_ID_MISMATCH' })
  })

  it('Should be able to resolve a name service domain', async () => {
    bsEthereum = new BSEthereum('ethereum')

    const address = await bsEthereum.resolveNameServiceDomain('alice.eth')

    expect(address).toEqual('0xcd2E72aEBe2A203b84f46DEEC948E6465dB51c75')
  })

  it.skip('Should be able to transfer a native token using an EVM using Testnet', async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.polygon.find(network => network.id === '80002')! // Amoy network
    const blockchain = 'polygon'
    const service = new BSEthereum(blockchain, network)
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
        relatedAddress: address,
        blockchain,
        isPending: true,
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

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
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
