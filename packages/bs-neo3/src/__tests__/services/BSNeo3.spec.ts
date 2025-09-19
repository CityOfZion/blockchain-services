import { generateMnemonic } from '@cityofzion/bs-asteroid-sdk'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3 } from '../../BSNeo3'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { TNetwork } from '@cityofzion/blockchain-service'
import { TBSNeo3NetworkId } from '../../types'

let bsNeo3: BSNeo3<'test'>
let network: TNetwork<TBSNeo3NetworkId>

describe('BSNeo3', () => {
  beforeAll(async () => {
    network = BSNeo3Constants.TESTNET_NETWORK
    bsNeo3 = new BSNeo3('test', network)
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
  })

  it('Should be able to encrypt a key', async () => {
    const mnemonic = generateMnemonic()
    const account = bsNeo3.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'TestPassword'
    const encryptedKey = await bsNeo3.encrypt(account.key, password)
    expect(encryptedKey).toEqual(expect.any(String))
  })

  it('Should be able to test the network', async () => {
    expect(() => bsNeo3.testNetwork(network)).not.toThrowError()
  })

  it.skip('Should be able to calculate transfer fee', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: bsNeo3.feeToken.hash,
          tokenDecimals: bsNeo3.feeToken.decimals,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeo3.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === bsNeo3.feeToken.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await bsNeo3.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: bsNeo3.feeToken.hash,
          tokenDecimals: bsNeo3.feeToken.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer with ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSNeo3('test', network, async () => transport)

    const account = await service.ledgerService.getAccount(transport, 0)

    const balance = await service.blockchainDataService.getBalance(account.address)
    const gasBalance = balance.find(b => b.token.symbol === service.feeToken.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '1',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: service.feeToken.hash,
          tokenDecimals: service.feeToken.decimals,
        },
      ],
    })
    transport.close()
    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to claim', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const unclaimed = await bsNeo3.claimDataService.getUnclaimed(account.address)
    expect(Number(unclaimed)).toBeGreaterThan(0)
    const transactionHash = await bsNeo3.claim(account)
    expect(transactionHash).toEqual(expect.any(String))
  })

  it('Should be able to resolve a name service domain', async () => {
    const owner = await bsNeo3.resolveNameServiceDomain('neo.neo')
    expect(owner).toEqual('Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf')
  })

  it.skip('Should be able to calculate transfer fee more than one intent', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const NEO = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'NEO')!
    const GAS = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'GAS')!

    const fee = await bsNeo3.calculateTransferFee({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: GAS.hash,
          tokenDecimals: GAS.decimals,
        },
        {
          amount: '1',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: NEO.hash,
          tokenDecimals: NEO.decimals,
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent', async () => {
    const account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const balance = await bsNeo3.blockchainDataService.getBalance(account.address)

    const NEO = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'NEO')!
    const GAS = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'GAS')!

    const gasBalance = balance.find(b => b.token.symbol === GAS.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const neoBalance = balance.find(b => b.token.symbol === NEO.symbol)
    expect(Number(neoBalance?.amount)).toBeGreaterThan(1)

    const [transactionHash] = await bsNeo3.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: GAS.hash,
          tokenDecimals: GAS.decimals,
        },
        {
          amount: '1',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: NEO.hash,
          tokenDecimals: NEO.decimals,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to transfer more than one intent with ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSNeo3('test', network, async () => transport)

    const account = await service.ledgerService.getAccount(transport, 0)

    const balance = await service.blockchainDataService.getBalance(account.address)

    const NEO = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'NEO')!
    const GAS = BSNeo3Helper.getTokens(network).find(token => token.symbol === 'GAS')!

    const gasBalance = balance.find(b => b.token.symbol === GAS.symbol)
    expect(Number(gasBalance?.amount)).toBeGreaterThan(0.00000001)

    const neoBalance = balance.find(b => b.token.symbol === NEO.symbol)
    expect(Number(neoBalance?.amount)).toBeGreaterThan(1)

    const [transactionHash] = await service.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: GAS.hash,
          tokenDecimals: GAS.decimals,
        },
        {
          amount: '1',
          receiverAddress: 'NPRMF5bmYuW23DeDJqsDJenhXkAPSJyuYe',
          tokenHash: NEO.hash,
          tokenDecimals: NEO.decimals,
        },
      ],
    })

    transport.close()
    expect(transactionHash).toEqual(expect.any(String))
  })
})
