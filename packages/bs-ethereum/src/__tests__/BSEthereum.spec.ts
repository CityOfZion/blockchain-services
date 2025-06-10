import { ethers } from 'ethers'
import { BSEthereum } from '../BSEthereum'
import { Account, Token } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'

const network = BSEthereumConstants.TESTNET_NETWORKS.find(network => network.id === '11155111')!

let bsEthereum: BSEthereum<'ethereum'>
let wallet: ethers.Wallet
let account: Account
let nativeToken: Token

describe('BSEthereum', () => {
  beforeEach(async () => {
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

  it('Should be able to generate a account from mnemonic', () => {
    const account = bsEthereum.generateAccountFromMnemonic(wallet.mnemonic.phrase, 0)

    expect(bsEthereum.validateAddress(account.address)).toBeTruthy()
    expect(bsEthereum.validateKey(account.key)).toBeTruthy()
  })

  it('Should be able to generate a account from wif', () => {
    const accountFromWif = bsEthereum.generateAccountFromKey(wallet.privateKey)
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

  it('Should be able to test the network', () => {
    expect(() => bsEthereum.testNetwork(network)).not.toThrowError()
  })

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsEthereum.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          tokenDecimals: 18,
          tokenHash: '0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc',
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer a native token', async () => {
    const account = bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const [transactionHash] = await bsEthereum.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer a ERC20 token', async () => {
    const account = bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const [transactionHash] = await bsEthereum.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00001',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          tokenDecimals: 6,
          tokenHash: '0x1291070C5f838DCCDddc56312893d3EfE9B372a8',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer a native token with ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSEthereum('neo3', network, async () => transport)
    const [account] = await service.ledgerService.getAccounts(transport)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
    await transport.close()
  }, 50000)

  it.skip('Should be able to transfer a ERC20 token with ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSEthereum('neo3', network, async () => transport)

    const [account] = await service.ledgerService.getAccounts(transport)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: 18,
          tokenHash: '0xcf185f2F3Fe19D82bFdcee59E3330FD7ba5f27ce',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
    await transport.close()
  }, 50000)

  it.skip('Should be able to resolve a name service domain', async () => {
    const address = await bsEthereum.resolveNameServiceDomain('alice.eth')
    expect(address).toEqual('0xa974890156A3649A23a6C0f2ebd77D6F7A7333d4')
  }, 10000)

  it.skip('Should be able to transfer a native token using a EVM', async () => {
    const polygonNetwork = BSEthereumConstants.TESTNET_NETWORKS.find(network => network.id === '80002')!
    const service = new BSEthereum('neo3', polygonNetwork)
    const account = service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to calculate transfer fee for more than one intent', async () => {
    const account = bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsEthereum.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
        {
          amount: '0.00000001',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer more than one intent', async () => {
    const account = bsEthereum.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const transactionHashes = await bsEthereum.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
        {
          amount: '0.00000001',
          receiverAddress: '0xFACf5446B71dB33E920aB1769d9427146183aEcd',
          tokenDecimals: 18,
          tokenHash: nativeToken.hash,
        },
      ],
    })

    expect(transactionHashes).toHaveLength(2)
  }, 50000)
})
