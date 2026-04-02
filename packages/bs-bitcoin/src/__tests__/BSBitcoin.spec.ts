import type { IBSBitcoin } from '../types'
import { BSBitcoin } from '../BSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import { BSBigHumanAmount, BSError, BSKeychainHelper, TTransferIntent } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

const invalidAddress = 'INVALID_ADDRESS'
const invalidKey = 'INVALID_KEY'

const mainnetLegacyAddress = '1CdyDwHCyDBwEKoihX6NR4iUstXyDVWNpj'
const testnetLegacyAddress = 'mvNUTVtLhwizzMwmFmosZs2yNie1F8ZTnB'

const mainnetP2SHAddress = '3QeBJuGbrzhapugTYw3feQEVGjpqNTcUa3'
const testnetP2SHAddress = '2N2USAxgBdXCwBdTWWKrrUBVFadRxwr7AiT'

const mainnetAddress = 'bc1qt88jq8vfnq6yv9lnz7ggak8wtry9hpsnqtjjmw'
const testnetAddress = 'tb1q27ayj6tdd2ut7pwvgw4n4xdrj5c3kyr2cpx3ml'

const mainnetKey = process.env.TEST_MAINNET_PRIVATE_KEY
const testnetKey = process.env.TEST_TESTNET_PRIVATE_KEY

const hexKey = process.env.TEST_HEX_PRIVATE_KEY

let service: IBSBitcoin

describe('BSBitcoin', () => {
  beforeEach(() => {
    service = new BSBitcoin()
  })

  it("Shouldn't be able to instantiate the service using Custom network", () => {
    try {
      new BSBitcoin({
        id: 'custom-network',
        name: 'Custom Network',
        url: 'https://custom-network.com',
        type: 'custom',
      })
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_NETWORK')
    }
  })

  it("Shouldn't be set network from Mainnet to Testnet", () => {
    try {
      service.setNetwork(BSBitcoinConstants.TESTNET_NETWORK)
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('NETWORK_NOT_COMPATIBLE')
    }
  })

  it("Shouldn't be set network from Testnet to Mainnet", () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    try {
      service.setNetwork(BSBitcoinConstants.MAINNET_NETWORK)
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('NETWORK_NOT_COMPATIBLE')
    }
  })

  it('Should be set network from Mainnet to Mainnet', () => {
    expect(() => service.setNetwork(BSBitcoinConstants.MAINNET_NETWORK)).not.toThrow()
  })

  it('Should be set network from Testnet to Testnet', () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    expect(() => service.setNetwork(BSBitcoinConstants.TESTNET_NETWORK)).not.toThrow()
  })

  it('Should be able to validate an address', () => {
    expect(service.validateAddress(mainnetAddress)).toBe(true)
    expect(service.validateAddress(mainnetLegacyAddress)).toBe(true)
    expect(service.validateAddress(mainnetP2SHAddress)).toBe(true)

    expect(service.validateAddress(testnetAddress)).toBe(false)
    expect(service.validateAddress(testnetLegacyAddress)).toBe(false)
    expect(service.validateAddress(testnetP2SHAddress)).toBe(false)

    expect(service.validateAddress(invalidAddress)).toBe(false)
  })

  it('Should be able to validate an address using Testnet', () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    expect(service.validateAddress(testnetAddress)).toBe(true)
    expect(service.validateAddress(testnetLegacyAddress)).toBe(true)
    expect(service.validateAddress(testnetP2SHAddress)).toBe(true)

    expect(service.validateAddress(mainnetAddress)).toBe(false)
    expect(service.validateAddress(mainnetLegacyAddress)).toBe(false)
    expect(service.validateAddress(mainnetP2SHAddress)).toBe(false)

    expect(service.validateAddress(invalidAddress)).toBe(false)
  })

  it('Should be able to validate a key', () => {
    expect(service.validateKey(mainnetKey)).toBe(true)

    expect(service.validateKey(hexKey)).toBe(true)

    expect(service.validateKey(invalidKey)).toBe(false)
  })

  it('Should be able to validate a key using Testnet', () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    expect(service.validateKey(testnetKey)).toBe(true)

    expect(service.validateKey(hexKey)).toBe(true)

    expect(service.validateKey(invalidKey)).toBe(false)
  })

  it('Should be able to validate an encrypted key', async () => {
    const encryptedKey = await service.encrypt(mainnetKey, 'password')

    expect(service.validateEncrypted(encryptedKey)).toBe(true)

    expect(service.validateEncrypted(mainnetKey)).toBe(false)

    expect(service.validateEncrypted(invalidKey)).toBe(false)
  })

  it('Should be able to validate an encrypted key using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const encryptedKey = await service.encrypt(testnetKey, 'password')

    expect(service.validateEncrypted(encryptedKey)).toBe(true)

    expect(service.validateEncrypted(testnetKey)).toBe(false)

    expect(service.validateEncrypted(invalidKey)).toBe(false)
  })

  it('Should be able to validate name service domain', () => {
    expect(service.validateNameServiceDomainFormat('domain.bitcoin')).toBe(true)

    expect(service.validateNameServiceDomainFormat('domain.btc')).toBe(true)

    expect(service.validateNameServiceDomainFormat('domain.eth')).toBe(false)
  })

  it('Should be able to generate an account from mnemonic', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const firstAccount = await service.generateAccountFromMnemonic(mnemonic, 0)
    const secondAccount = await service.generateAccountFromMnemonic(mnemonic, 1)

    expect(service.validateAddress(firstAccount.address)).toBe(true)
    expect(service.validateAddress(secondAccount.address)).toBe(true)

    expect(service.validateKey(firstAccount.key)).toBe(true)
    expect(service.validateKey(secondAccount.key)).toBe(true)

    expect(firstAccount).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
        blockchain: 'bitcoin',
      })
    )

    expect(secondAccount).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 1),
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to generate an account from mnemonic using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const mnemonic = BSKeychainHelper.generateMnemonic()
    const firstAccount = await service.generateAccountFromMnemonic(mnemonic, 0)
    const secondAccount = await service.generateAccountFromMnemonic(mnemonic, 1)

    expect(service.validateAddress(firstAccount.address)).toBe(true)
    expect(service.validateAddress(secondAccount.address)).toBe(true)

    expect(service.validateKey(firstAccount.key)).toBe(true)
    expect(service.validateKey(secondAccount.key)).toBe(true)

    expect(firstAccount).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
        blockchain: 'bitcoin',
      })
    )

    expect(secondAccount).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 1),
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to generate an account from public key', async () => {
    const account = await service.generateAccountFromPublicKey(mainnetAddress)
    const legacyAccount = await service.generateAccountFromPublicKey(mainnetLegacyAddress)
    const p2shAccount = await service.generateAccountFromPublicKey(mainnetP2SHAddress)

    expect(account).toEqual(
      expect.objectContaining({
        address: mainnetAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )

    expect(legacyAccount).toEqual(
      expect.objectContaining({
        address: mainnetLegacyAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )

    expect(p2shAccount).toEqual(
      expect.objectContaining({
        address: mainnetP2SHAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to generate an account from public key using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const account = await service.generateAccountFromPublicKey(testnetAddress)
    const legacyAccount = await service.generateAccountFromPublicKey(testnetLegacyAddress)
    const p2shAccount = await service.generateAccountFromPublicKey(testnetP2SHAddress)

    expect(account).toEqual(
      expect.objectContaining({
        address: testnetAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )

    expect(legacyAccount).toEqual(
      expect.objectContaining({
        address: testnetLegacyAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )

    expect(p2shAccount).toEqual(
      expect.objectContaining({
        address: testnetP2SHAddress,
        key: expect.any(String),
        type: 'publicKey',
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to generate an account from key', async () => {
    const account = await service.generateAccountFromKey(mainnetKey)

    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to generate an account from key using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const account = await service.generateAccountFromKey(testnetKey)

    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'wif',
        blockchain: 'bitcoin',
      })
    )
  })

  it('Should be able to decrypt an encrypted key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'password'
    const encryptedKey = await service.encrypt(account.key, password)
    const decryptedAccount = await service.decrypt(encryptedKey, password)

    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  })

  it('Should be able to encrypt a key', async () => {
    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const encryptedKey = await service.encrypt(account.key, 'password')

    expect(encryptedKey).toEqual(expect.any(String))
  })

  it('Should be able to decrypt an encrypted key using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const password = 'password'
    const encryptedKey = await service.encrypt(account.key, password)
    const decryptedAccount = await service.decrypt(encryptedKey, password)

    expect(account).toEqual(expect.objectContaining(decryptedAccount))
  })

  it('Should be able to encrypt a key using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const mnemonic = BSKeychainHelper.generateMnemonic()
    const account = await service.generateAccountFromMnemonic(mnemonic, 0)
    const encryptedKey = await service.encrypt(account.key, 'password')

    expect(encryptedKey).toEqual(expect.any(String))
  })

  it('Should be able to ping network', async () => {
    const response = await service.pingNetwork()

    expect(response).toEqual({
      latency: expect.any(Number),
      url: service.network.url,
      height: expect.any(Number),
    })
  })

  it('Should be able to ping network using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const response = await service.pingNetwork()

    expect(response).toEqual({
      latency: expect.any(Number),
      url: service.network.url,
      height: expect.any(Number),
    })
  })

  it('Should be able to resolve a name service domain', async () => {
    const address = await service.resolveNameServiceDomain('test.btc')

    expect(address).toEqual('bc1q049ukqxsd3gkxsw7ahllhm4ldev2m3kl2zsjf4')
  })

  it("Shouldn't be able to resolve an invalid name service domain", async () => {
    await expect(service.resolveNameServiceDomain('test.eth')).rejects.toThrow()
  })

  it("Shouldn't be able to resolve a name service domain using Testnet", async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    await expect(service.resolveNameServiceDomain('satoshi.btc')).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_NETWORK')

      return true
    })
  })

  it('Should be able to calculate fee using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.0004',
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to calculate fee with tip using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)

    const tipIntent: TTransferIntent = {
      amount: '0.00000002',
      receiverAddress: testnetAddress,
      token: BSBitcoinConstants.NATIVE_TOKEN,
    }

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.0004',
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
        tipIntent,
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it("Shouldn't be able to calculate fee if there isn't UTXO available using Testnet", async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const mnemonic = BSKeychainHelper.generateMnemonic()
    const senderAccount = await service.generateAccountFromMnemonic(mnemonic, 0)

    const promise = service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    await expect(promise).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('NO_UTXO_AVAILABLE')

      return true
    })
  })

  it("Shouldn't be able to calculate fee if the token is BRC-20", async () => {
    const senderAccount = await service.generateAccountFromKey(mainnetKey)

    const promise = service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.00000001',
          receiverAddress: mainnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
        {
          amount: '0.0001',
          receiverAddress: mainnetAddress,
          token: {
            symbol: 'ORDI',
            name: 'ORDI',
            hash: 'b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0',
            decimals: 18,
          },
        },
      ],
    })

    await expect(promise).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('BRC20_NOT_SUPPORTED')

      return true
    })
  })

  it("Shouldn't be able to calculate fee if available UTXOs doesn't pay the transaction using Testnet", async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)

    const promise = service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '100',
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    await expect(promise).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INSUFFICIENT_FUNDS')

      return true
    })
  })

  it.skip('Should be able to calculate fee with max balance using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)
    const balance = await service.blockchainDataService.getBalance(senderAccount.address)
    const btcToken = BSBitcoinConstants.NATIVE_TOKEN

    const btcTokenBalance = balance.find(({ token }) =>
      service.tokenService.predicateByHash(token.hash, btcToken.hash)
    )!

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: btcTokenBalance.amount,
          receiverAddress: testnetAddress,
          token: btcToken,
        },
      ],
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to calculate fee with max balance with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK, async () => transport)

    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const balance = await service.blockchainDataService.getBalance(senderAccount.address)
    const btcToken = BSBitcoinConstants.NATIVE_TOKEN

    const btcTokenBalance = balance.find(({ token }) =>
      service.tokenService.predicateByHash(token.hash, btcToken.hash)
    )!

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: btcTokenBalance.amount,
          receiverAddress: testnetAddress,
          token: btcToken,
        },
      ],
    })

    await transport.close()

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to transfer using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)
    const firstAmount = '0.005'
    const secondAmount = '0.0002'

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
        {
          amount: secondAmount,
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        hex: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        totalAmount: expect.any(String),
        view: 'utxo',
        nfts: [],
        inputs: expect.arrayContaining([
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: expect.any(String),
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ]),
        outputs: [
          {
            address: testnetAddress,
            addressUrl: expect.any(String),
            amount: firstAmount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
          {
            address: testnetAddress,
            addressUrl: expect.any(String),
            amount: secondAmount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK, async () => transport)

    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const firstAmount = '0.005'
    const secondAmount = '0.0002'

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: senderAccount.address,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
        {
          amount: secondAmount,
          receiverAddress: senderAccount.address,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        hex: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        totalAmount: expect.any(String),
        view: 'utxo',
        nfts: [],
        inputs: expect.arrayContaining([
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: expect.any(String),
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ]),
        outputs: [
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: firstAmount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: secondAmount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer the max balance using Testnet', async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)
    const balance = await service.blockchainDataService.getBalance(senderAccount.address)
    const btcToken = BSBitcoinConstants.NATIVE_TOKEN

    const btcTokenBalance = balance.find(({ token }) =>
      service.tokenService.predicateByHash(token.hash, btcToken.hash)
    )!

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: btcTokenBalance.amount,
          receiverAddress: testnetAddress,
          token: btcToken,
        },
      ],
    })

    const amount = new BSBigHumanAmount(btcTokenBalance.amount).minus(fee).toFixed()

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: testnetAddress,
          token: btcToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        hex: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        totalAmount: expect.any(String),
        view: 'utxo',
        nfts: [],
        inputs: expect.arrayContaining([
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: expect.any(String),
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ]),
        outputs: [
          {
            address: testnetAddress,
            addressUrl: expect.any(String),
            amount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer the max balance with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK, async () => transport)

    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const balance = await service.blockchainDataService.getBalance(senderAccount.address)
    const btcToken = BSBitcoinConstants.NATIVE_TOKEN

    const btcTokenBalance = balance.find(({ token }) =>
      service.tokenService.predicateByHash(token.hash, btcToken.hash)
    )!

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: btcTokenBalance.amount,
          receiverAddress: senderAccount.address,
          token: btcToken,
        },
      ],
    })

    const amount = new BSBigHumanAmount(btcTokenBalance.amount).minus(fee).toFixed()

    const transactions = await service.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: senderAccount.address,
          token: btcToken,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        hex: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^0\.0\d*[1-9]$/),
        totalAmount: expect.any(String),
        view: 'utxo',
        nfts: [],
        inputs: expect.arrayContaining([
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount: expect.any(String),
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ]),
        outputs: [
          {
            address: senderAccount.address,
            addressUrl: expect.any(String),
            amount,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ],
      },
    ])
  })

  it("Shouldn't be able to transfer if available UTXOs doesn't pay the transaction using Testnet", async () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)

    const senderAccount = await service.generateAccountFromKey(testnetKey)

    const promise = service.transfer({
      senderAccount,
      intents: [
        {
          amount: '100',
          receiverAddress: testnetAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    await expect(promise).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INSUFFICIENT_FUNDS')

      return true
    })
  })
})
