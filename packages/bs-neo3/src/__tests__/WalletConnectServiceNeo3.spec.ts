import { BSError, BSKeychainHelper, type TBSAccount } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '../BSNeo3'
import { WalletConnectServiceNeo3 } from '../services/wallet-connect/WalletConnectServiceNeo3'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import type { TBSNeo3Name } from '../types'
import { wallet } from '@cityofzion/neon-core'

let service: BSNeo3
let walletConnectService: WalletConnectServiceNeo3
let account: TBSAccount<TBSNeo3Name>

describe('WalletConnectServiceNeo3', () => {
  beforeEach(async () => {
    service = new BSNeo3(BSNeo3Constants.TESTNET_NETWORK)
    walletConnectService = new WalletConnectServiceNeo3(service)

    const mnemonic = BSKeychainHelper.generateMnemonic()
    account = await service.generateAccountFromMnemonic(mnemonic, 0)
  })

  it('Should have correct namespace and chain', () => {
    expect(walletConnectService.namespace).toBe('neo3')
    expect(walletConnectService.chain).toBe(`neo3:${service.network.id}`)
  })

  it('Should have correct chain for custom network', () => {
    const customService = new BSNeo3({
      id: 'custom-id',
      name: 'Custom',
      url: 'http://localhost:50012',
      type: 'custom',
    })
    const customWalletConnectService = new WalletConnectServiceNeo3(customService)

    expect(customWalletConnectService.chain).toBe('neo3:private')
  })

  it('Should have supported methods', () => {
    expect(walletConnectService.supportedMethods).toContain('invokeFunction')
    expect(walletConnectService.supportedMethods).toContain('testInvoke')
    expect(walletConnectService.supportedMethods).toContain('signMessage')
    expect(walletConnectService.supportedMethods).toContain('verifyMessage')
    expect(walletConnectService.supportedMethods).toContain('getWalletInfo')
    expect(walletConnectService.supportedMethods).toContain('traverseIterator')
    expect(walletConnectService.supportedMethods).toContain('getNetworkVersion')
    expect(walletConnectService.supportedMethods).toContain('encrypt')
    expect(walletConnectService.supportedMethods).toContain('decrypt')
    expect(walletConnectService.supportedMethods).toContain('decryptFromArray')
    expect(walletConnectService.supportedMethods).toContain('calculateFee')
    expect(walletConnectService.supportedMethods).toContain('signTransaction')
  })

  it('Should have calculable methods', () => {
    expect(walletConnectService.calculableMethods).toContain('invokeFunction')
    expect(walletConnectService.calculableMethods).toContain('signTransaction')
  })

  it('Should have auto approve methods', () => {
    expect(walletConnectService.autoApproveMethods).toContain('testInvoke')
    expect(walletConnectService.autoApproveMethods).toContain('getWalletInfo')
    expect(walletConnectService.autoApproveMethods).toContain('traverseIterator')
    expect(walletConnectService.autoApproveMethods).toContain('getNetworkVersion')
    expect(walletConnectService.autoApproveMethods).toContain('calculateFee')
  })

  it('Should have empty supported events', () => {
    expect(walletConnectService.supportedEvents).toEqual([])
  })

  it("Shouldn't be able to validate invokeFunction with invalid params", async () => {
    await expect(walletConnectService.handlers.invokeFunction.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.invokeFunction.validate('invalid')).rejects.toThrow()
    await expect(
      walletConnectService.handlers.invokeFunction.validate({ invocations: [], signers: 'invalid' })
    ).rejects.toThrow()
  })

  it('Should be able to validate invokeFunction params', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'transfer',
          args: [
            { type: 'Hash160' as const, value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
            { type: 'Hash160' as const, value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
            { type: 'Integer' as const, value: '1' },
            { type: 'Any' as const, value: null },
          ],
        },
      ],
      signers: [{ scopes: 'CalledByEntry' }],
    }

    const result = await walletConnectService.handlers.invokeFunction.validate(validParams)
    expect(result).toBeDefined()
    expect(result.invocations).toHaveLength(1)
    expect(result.signers).toHaveLength(1)
  })

  it('Should be able to validate invokeFunction params with optional fields', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'transfer',
          args: [{ type: 'String' as const, value: 'test' }],
          abortOnFail: true,
        },
      ],
      signers: [
        {
          scopes: 'CalledByEntry',
          account: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          allowedContracts: ['0xd2a4cff31913016155e38e474a2c06d08be276cf'],
          allowedGroups: ['031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936'],
          rules: [{ action: 'Allow', condition: { type: 'Boolean', value: true } }],
        },
      ],
      extraSystemFee: 100,
      systemFeeOverride: 200,
      extraNetworkFee: 50,
      networkFeeOverride: 150,
    }

    const result = await walletConnectService.handlers.invokeFunction.validate(validParams)
    expect(result).toBeDefined()
    expect(result.extraSystemFee).toBe(100)
    expect(result.signers[0].allowedContracts).toHaveLength(1)
  })

  it('Should be able to validate invokeFunction params with all arg types', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'test',
          args: [
            { type: 'Any' as const, value: null },
            { type: 'String' as const, value: 'test' },
            { type: 'Boolean' as const, value: true },
            { type: 'PublicKey' as const, value: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936' },
            { type: 'Hash160' as const, value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
            { type: 'Hash256' as const, value: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' },
            { type: 'Integer' as const, value: '100' },
            { type: 'ByteArray' as const, value: '0102030405' },
            { type: 'Array' as const, value: [1, 2, 3] },
            { type: 'Map' as const, value: [['key', 'value']] },
          ],
        },
      ],
      signers: [{ scopes: 1 }],
    }

    const result = await walletConnectService.handlers.invokeFunction.validate(validParams)
    expect(result.invocations[0].args).toHaveLength(10)
  })

  it("Shouldn't be able to calculate request fee with invalid params", async () => {
    await expect(
      walletConnectService.calculateRequestFee({
        account,
        method: 'invokeFunction',
        params: 'invalid',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_PARAMS')

      return true
    })
  })

  it('Should be able to calculate request fee', async () => {
    const result = await walletConnectService.calculateRequestFee({
      account,
      method: 'invokeFunction',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it("Shouldn't be able to validate testInvoke with invalid params", async () => {
    await expect(walletConnectService.handlers.testInvoke.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.testInvoke.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate testInvoke params', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'symbol',
          args: [],
        },
      ],
      signers: [{ scopes: 'CalledByEntry' }],
    }

    const result = await walletConnectService.handlers.testInvoke.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process testInvoke', async () => {
    const result = await walletConnectService.handlers.testInvoke.process({
      account,
      method: 'testInvoke',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    expect(result).toBeDefined()
  })

  it('Should be able to validate signTransaction params', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'transfer',
          args: [
            { type: 'Hash160' as const, value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
            { type: 'Hash160' as const, value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
            { type: 'Integer' as const, value: '1' },
            { type: 'Any' as const, value: null },
          ],
        },
      ],
      signers: [{ scopes: 'CalledByEntry' }],
    }

    const result = await walletConnectService.handlers.signTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process signTransaction', async () => {
    const result = await walletConnectService.handlers.signTransaction.process({
      account,
      method: 'signTransaction',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    expect(result).toBeDefined()
    expect(result.invocations).toBeDefined()
    expect(result.signers).toBeDefined()
    expect(result.witnesses).toBeDefined()
    expect(Array.isArray(result.witnesses)).toBe(true)
    expect(result.script).toBeDefined()
    expect(result.networkFee).toBeDefined()
    expect(result.systemFee).toBeDefined()
    expect(result.validUntilBlock).toBeDefined()
  })

  it('Should be able to process signTransaction with multiple invocations', async () => {
    const result = await walletConnectService.handlers.signTransaction.process({
      account,
      method: 'signTransaction',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    expect(result).toBeDefined()
    expect(result.witnesses).toBeDefined()
    expect(result.witnesses[0].invocation).toBeDefined()
    expect(result.witnesses[0].verification).toBeDefined()
  })

  it('Should be able to process signTransaction and the witness should match the account', async () => {
    const neonJsAccount = new wallet.Account(account.key)

    const result = await walletConnectService.handlers.signTransaction.process({
      account,
      method: 'signTransaction',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    const verificationHex = Buffer.from(result.witnesses[0].verification, 'base64').toString('hex')
    expect(verificationHex).toContain(neonJsAccount.publicKey)
  })

  it('Should be able to validate calculateFee params', async () => {
    const validParams = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'symbol',
          args: [],
        },
      ],
      signers: [{ scopes: 'CalledByEntry' }],
    }

    const result = await walletConnectService.handlers.calculateFee.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process calculateFee', async () => {
    const result = await walletConnectService.handlers.calculateFee.process({
      account,
      method: 'calculateFee',
      params: {
        invocations: [
          {
            scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            operation: 'symbol',
            args: [],
          },
        ],
        signers: [{ scopes: 'CalledByEntry' }],
      },
    })

    expect(result).toBeDefined()
    expect(result.networkFee).toBeDefined()
    expect(result.systemFee).toBeDefined()
    expect(result.total).toBeDefined()
  })

  it("Shouldn't be able to validate signMessage with invalid params", async () => {
    await expect(walletConnectService.handlers.signMessage.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.signMessage.validate({ message: 123 })).rejects.toThrow()
    await expect(walletConnectService.handlers.signMessage.validate({ message: 'test', version: 4 })).rejects.toThrow()
  })

  it('Should be able to validate signMessage params', async () => {
    const validParams = { message: 'Hello, World!' }
    const result = await walletConnectService.handlers.signMessage.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to validate signMessage params with version', async () => {
    const validParams = { message: 'Hello, World!', version: 2 as const }
    const result = await walletConnectService.handlers.signMessage.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to process signMessage', async () => {
    const result = await walletConnectService.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { message: 'Hello, World!' },
    })

    expect(result).toBeDefined()
  })

  it('Should be able to process signMessage with version', async () => {
    const result = await walletConnectService.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { message: 'Hello, World!', version: 3 },
    })

    expect(result).toBeDefined()
    expect(result.publicKey).toBeDefined()
    expect(result.data).toBeDefined()
  })

  it('Should be able to process signMessage and verifyMessage', async () => {
    const message = 'Hello, World!'

    const signResult = await walletConnectService.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { message },
    })

    expect(signResult).toBeDefined()
    expect(signResult.publicKey).toBeDefined()
    expect(signResult.data).toBeDefined()
    expect(signResult.salt).toBeDefined()
    expect(signResult.messageHex).toBeDefined()

    const verifyResult = await walletConnectService.handlers.verifyMessage.process({
      account,
      method: 'verifyMessage',
      params: {
        publicKey: signResult.publicKey,
        data: signResult.data,
        salt: signResult.salt,
        messageHex: signResult.messageHex,
      },
    })

    expect(verifyResult).toBe(true)
  })

  it("Shouldn't be able to validate verifyMessage with invalid params", async () => {
    await expect(walletConnectService.handlers.verifyMessage.validate({})).rejects.toThrow()
    await expect(
      walletConnectService.handlers.verifyMessage.validate({ publicKey: 'key', data: 'data' })
    ).rejects.toThrow()
  })

  it('Should be able to validate verifyMessage params with message', async () => {
    const validParams = {
      publicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
      data: 'some-signed-data',
      message: 'Hello, World!',
    }

    const result = await walletConnectService.handlers.verifyMessage.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate verifyMessage params with messageHex', async () => {
    const validParams = {
      publicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
      data: 'some-signed-data',
      messageHex: '48656c6c6f',
    }

    const result = await walletConnectService.handlers.verifyMessage.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate verifyMessage params with salt', async () => {
    const validParams = {
      publicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
      data: 'some-signed-data',
      message: 'Hello, World!',
      salt: 'random-salt',
    }

    const result = await walletConnectService.handlers.verifyMessage.validate(validParams)
    expect(result).toBeDefined()
  })

  it("Shouldn't be able to validate encrypt with invalid params", async () => {
    await expect(walletConnectService.handlers.encrypt.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.encrypt.validate([123])).rejects.toThrow()
  })

  it('Should be able to validate encrypt params without public keys', async () => {
    const validParams = ['Hello, World!']
    const result = await walletConnectService.handlers.encrypt.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate encrypt params', async () => {
    const validParams = ['Hello, World!', ['031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936']]
    const result = await walletConnectService.handlers.encrypt.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process encrypt and decrypt', async () => {
    const message = 'Hello, World!'

    const encryptResult = await walletConnectService.handlers.encrypt.process({
      account,
      method: 'encrypt',
      params: [message],
    })

    expect(encryptResult).toBeDefined()
    expect(Array.isArray(encryptResult)).toBe(true)
    expect(encryptResult.length).toBeGreaterThan(0)
    expect(encryptResult[0].randomVector).toBeDefined()
    expect(encryptResult[0].cipherText).toBeDefined()
    expect(encryptResult[0].dataTag).toBeDefined()
    expect(encryptResult[0].ephemPublicKey).toBeDefined()

    const decryptResult = await walletConnectService.handlers.decrypt.process({
      account,
      method: 'decrypt',
      params: [encryptResult[0]],
    })

    expect(decryptResult).toBe(message)
  })

  it('Should be able to process encrypt with explicit public keys', async () => {
    const neonJsAccount = new wallet.Account(account.key)
    const publicKey = neonJsAccount.publicKey

    const encryptResult = await walletConnectService.handlers.encrypt.process({
      account,
      method: 'encrypt',
      params: ['Secret message', [publicKey]],
    })

    expect(encryptResult).toBeDefined()
    expect(Array.isArray(encryptResult)).toBe(true)
    expect(encryptResult).toHaveLength(1)
  })

  it("Shouldn't be able to validate decrypt with invalid params", async () => {
    await expect(walletConnectService.handlers.decrypt.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.decrypt.validate([{}])).rejects.toThrow()
    await expect(walletConnectService.handlers.decrypt.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate decrypt params', async () => {
    const validParams = [
      {
        randomVector: 'abc123',
        cipherText: 'encrypted-text',
        dataTag: 'tag123',
        ephemPublicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
      },
    ]

    const result = await walletConnectService.handlers.decrypt.validate(validParams)
    expect(result).toBeDefined()
  })

  it("Shouldn't be able to validate decryptFromArray with invalid params", async () => {
    await expect(walletConnectService.handlers.decryptFromArray.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.decryptFromArray.validate([[{}]])).rejects.toThrow()
  })

  it('Should be able to validate decryptFromArray params', async () => {
    const validParams = [
      [
        {
          randomVector: 'abc123',
          cipherText: 'encrypted-text',
          dataTag: 'tag123',
          ephemPublicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
        },
        {
          randomVector: 'def456',
          cipherText: 'another-encrypted-text',
          dataTag: 'tag456',
          ephemPublicKey: '031757edb62014dea30a0e3224c8581e4f74627e8c8632ce1ef1b36f5bb2b23936',
        },
      ],
    ]

    const result = await walletConnectService.handlers.decryptFromArray.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process decryptFromArray', async () => {
    const message = 'Hello, World!'

    const encryptResult = await walletConnectService.handlers.encrypt.process({
      account,
      method: 'encrypt',
      params: [message],
    })

    const decryptResult = await walletConnectService.handlers.decryptFromArray.process({
      account,
      method: 'decryptFromArray',
      params: [encryptResult],
    })

    expect(decryptResult).toBeDefined()
    expect(decryptResult.message).toBe(message)
    expect(decryptResult.keyIndex).toBe(0)
  })

  it("Shouldn't be able to validate traverseIterator with invalid params", async () => {
    await expect(walletConnectService.handlers.traverseIterator.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.traverseIterator.validate(['a', 'b'])).rejects.toThrow()
    await expect(walletConnectService.handlers.traverseIterator.validate(['a', 'b', 'c'])).rejects.toThrow()
  })

  it('Should be able to validate traverseIterator params', async () => {
    const validParams = ['session-id', 'iterator-id', 10]
    const result = await walletConnectService.handlers.traverseIterator.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to validate getNetworkVersion params', async () => {
    await expect(walletConnectService.handlers.getNetworkVersion.validate(undefined)).resolves.not.toThrow()
  })

  it('Should be able to process getNetworkVersion', async () => {
    const result = await walletConnectService.handlers.getNetworkVersion.process({
      account,
      method: 'getNetworkVersion',
      params: undefined,
    })

    expect(result).toBeDefined()
    expect(result.rpcAddress).toBe(service.network.url)
  })

  it('Should be able to validate getWalletInfo params', async () => {
    await expect(walletConnectService.handlers.getWalletInfo.validate(undefined)).resolves.not.toThrow()
  })

  it('Should be able to process getWalletInfo', async () => {
    const result = await walletConnectService.handlers.getWalletInfo.process({
      account,
      method: 'getWalletInfo',
      params: undefined,
    })

    expect(result).toEqual({ isLedger: false })
  })

  it('Should return isLedger true for hardware account', async () => {
    const hardwareAccount: TBSAccount<TBSNeo3Name> = {
      ...account,
      isHardware: true,
    }

    const result = await walletConnectService.handlers.getWalletInfo.process({
      account: hardwareAccount,
      method: 'getWalletInfo',
      params: undefined,
    })

    expect(result).toEqual({ isLedger: true })
  })
})
