import { BSBigHumanAmount, BSError, type TBSAccount } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { WalletConnectServiceBitcoin } from '../services/wallet-connect/WalletConnectServiceBitcoin'
import type { IBSBitcoin, TBSBitcoinName, TSignInput, TTatumUtxosResponse } from '../types'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import { BSBitcoinTatumHelper } from '../helpers/BSBitcoinTatumHelper'
import * as bitcoinjs from 'bitcoinjs-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import Transport from '@ledgerhq/hw-transport'

const mainnetKey = process.env.TEST_MAINNET_PRIVATE_KEY
const testnetKey = process.env.TEST_TESTNET_PRIVATE_KEY
const mnemonic = process.env.TEST_MNEMONIC

let service: IBSBitcoin
let walletConnectServiceBitcoin: WalletConnectServiceBitcoin
let account: TBSAccount<TBSBitcoinName>
let accountFromMnemonic: TBSAccount<TBSBitcoinName>

const buildTestnetData = async (transport?: Transport) => {
  service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK, transport ? async () => transport : undefined)
  walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)

  account = await (transport
    ? service.ledgerService.getAccount(transport, 0)
    : service.generateAccountFromKey(testnetKey))

  accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)
}

const buildSignPsbtTestnetParams = async () => {
  const signInputs: TSignInput[] = []
  const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.testnet })
  const tatumApi = BSBitcoinTatumHelper.getApi(BSBitcoinConstants.TESTNET_NETWORK)

  let signInputIndex = 0
  let amountBn = new BSBigHumanAmount(0, BSBitcoinConstants.NATIVE_TOKEN.decimals)

  const utxoResponse = await tatumApi.get<TTatumUtxosResponse>('/v4/data/utxos', {
    params: {
      address: account.address,
      totalValue: 1_0000,
    },
  })

  for (const utxo of utxoResponse.data) {
    const { txHash, index, value, address } = utxo
    const { hex } = await service.blockchainDataService.getTransaction(txHash)
    const transaction = bitcoinjs.Transaction.fromHex(hex)
    const output = transaction.outs[index]

    const input: Parameters<bitcoinjs.Psbt['addInput']>[0] = {
      hash: txHash,
      index,
      nonWitnessUtxo: Buffer.from(hex, 'hex'),
      witnessUtxo: {
        script: output.script,
        value: new BSBigHumanAmount(value, BSBitcoinConstants.NATIVE_TOKEN.decimals).toUnit().toBigInt(),
      },
    }

    psbt.addInput(input)
    signInputs.push({ index: signInputIndex, address })

    amountBn = amountBn.plus(value)

    ++signInputIndex
  }

  psbt.addOutput({
    address: account.address,
    value: amountBn.toUnit().minus('200').toBigInt(), // Amount and any fee
  })

  return { psbt: psbt.toBase64(), signInputs }
}

describe('WalletConnectServiceBitcoin', () => {
  beforeEach(async () => {
    service = new BSBitcoin()
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.generateAccountFromKey(mainnetKey)
    accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)
  })

  it('Should have correct namespace and chain', () => {
    expect(walletConnectServiceBitcoin.namespace).toBe('bip122')
    expect(walletConnectServiceBitcoin.chain).toBe('bip122:000000000019d6689c085ae165831e93')
  })

  it('Should have correct namespace and chain using Testnet', () => {
    service = new BSBitcoin(BSBitcoinConstants.TESTNET_NETWORK)
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)

    expect(walletConnectServiceBitcoin.namespace).toBe('bip122')
    expect(walletConnectServiceBitcoin.chain).toBe('bip122:000000000933ea01ad0ee984209779ba')
  })

  it('Should have supported methods', () => {
    expect(walletConnectServiceBitcoin.supportedMethods).toContain('getAccountAddresses')
    expect(walletConnectServiceBitcoin.supportedMethods).toContain('signPsbt')
    expect(walletConnectServiceBitcoin.supportedMethods).toContain('signMessage')
    expect(walletConnectServiceBitcoin.supportedMethods).toContain('sendTransfer')
  })

  it('Should have calculable methods', () => {
    expect(walletConnectServiceBitcoin.calculableMethods).toContain('sendTransfer')
    expect(walletConnectServiceBitcoin.calculableMethods).toHaveLength(1)
  })

  it('Should have auto approve methods', () => {
    expect(walletConnectServiceBitcoin.autoApproveMethods).toContain('getAccountAddresses')
    expect(walletConnectServiceBitcoin.autoApproveMethods).toHaveLength(1)
  })

  it('Should have supported events', () => {
    expect(walletConnectServiceBitcoin.supportedEvents).toContain('bip122_addressesChanged')
  })

  it("Shouldn't be able to validate getAccountAddresses with invalid params", async () => {
    await expect(walletConnectServiceBitcoin.handlers.getAccountAddresses.validate({})).rejects.toThrow()
    await expect(walletConnectServiceBitcoin.handlers.getAccountAddresses.validate({ account: 123 })).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.getAccountAddresses.validate({
        account: account.address,
        intentions: 'payment',
      })
    ).rejects.toThrow()
  })

  it('Should be able to validate getAccountAddresses params', async () => {
    const result = await walletConnectServiceBitcoin.handlers.getAccountAddresses.validate({ account: account.address })
    expect(result).toEqual({ account: account.address })
  })

  it('Should be able to validate getAccountAddresses params with intentions', async () => {
    const result = await walletConnectServiceBitcoin.handlers.getAccountAddresses.validate({
      account: account.address,
      intentions: ['payment'],
    })
    expect(result).toEqual({ account: account.address, intentions: ['payment'] })
  })

  it("Shouldn't be able to get account addresses with sender account different from account", async () => {
    try {
      await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
        account,
        method: 'getAccountAddresses',
        params: { account: accountFromMnemonic.address },
      })
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }
  })

  it("Shouldn't be able to get account addresses with intentions not supported", async () => {
    try {
      await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
        account,
        method: 'getAccountAddresses',
        params: { account: account.address, intentions: ['ordinal'] },
      })
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INTENTIONS_NOT_SUPPORTED')
    }

    try {
      await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
        account,
        method: 'getAccountAddresses',
        params: { account: account.address, intentions: ['payment', 'ordinal'] },
      })
    } catch (error: any) {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INTENTIONS_NOT_SUPPORTED')
    }
  })

  it('Should be able to get accounts address', async () => {
    const accountsResponse = [
      { address: account.address, publicKey: expect.any(String), path: account.bipPath, intention: 'payment' },
    ]

    const firstAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',
      params: { account: account.address },
    })

    const secondAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',
      params: { account: account.address, intentions: [] },
    })

    const thirdAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',
      params: { account: account.address, intentions: ['payment'] },
    })

    const fourthAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account: accountFromMnemonic,
      method: 'getAccountAddresses',
      params: { account: accountFromMnemonic.address },
    })

    expect(firstAccounts).toEqual(accountsResponse)
    expect(secondAccounts).toEqual(accountsResponse)
    expect(thirdAccounts).toEqual(accountsResponse)
    expect(fourthAccounts).toEqual([
      {
        address: accountFromMnemonic.address,
        publicKey: expect.any(String),
        path: accountFromMnemonic.bipPath,
        intention: 'payment',
      },
    ])
  })

  it.skip('Should be able to get accounts address with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSBitcoin(undefined, async () => transport)
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.ledgerService.getAccount(transport, 0)

    const accountsResponse = [
      { address: account.address, publicKey: undefined, path: account.bipPath, intention: 'payment' },
    ]

    const firstAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',
      params: { account: account.address },
    })

    const secondAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',

      params: { account: account.address, intentions: [] },
    })

    const thirdAccounts = await walletConnectServiceBitcoin.handlers.getAccountAddresses.process({
      account,
      method: 'getAccountAddresses',
      params: { account: account.address, intentions: ['payment'] },
    })

    await transport.close()

    expect(firstAccounts).toEqual(accountsResponse)
    expect(secondAccounts).toEqual(accountsResponse)
    expect(thirdAccounts).toEqual(accountsResponse)
  })

  it("Shouldn't be able to validate signMessage with invalid params", async () => {
    await expect(walletConnectServiceBitcoin.handlers.signMessage.validate({})).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.signMessage.validate({ account: account.address })
    ).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.signMessage.validate({ account: account.address, message: 123 })
    ).rejects.toThrow()
  })

  it('Should be able to validate signMessage params', async () => {
    const params = {
      account: account.address,
      message: 'Hello!',
    }

    const result = await walletConnectServiceBitcoin.handlers.signMessage.validate(params)
    expect(result).toEqual(params)
  })

  it('Should be able to validate signMessage params with optional fields', async () => {
    const params = {
      account: account.address,
      message: 'Hello!',
      address: accountFromMnemonic.address,
      protocol: 'ecdsa',
    }

    const result = await walletConnectServiceBitcoin.handlers.signMessage.validate(params)

    expect(result).toEqual(params)
  })

  it("Shouldn't be able to sign message with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.handlers.signMessage.process({
        account,
        method: 'signMessage',
        params: { account: accountFromMnemonic.address, message: 'My message' },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')

      return true
    })
  })

  it('Should be able to sign message', async () => {
    const firstResponse = await walletConnectServiceBitcoin.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { account: account.address, message: 'My message' },
    })

    const secondResponse = await walletConnectServiceBitcoin.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { account: account.address, address: accountFromMnemonic.address, message: 'My message' },
    })

    const thirdResponse = await walletConnectServiceBitcoin.handlers.signMessage.process({
      account: accountFromMnemonic,
      method: 'signMessage',
      params: { account: accountFromMnemonic.address, message: 'My message' },
    })

    expect(firstResponse).toEqual({
      address: account.address,
      signature: expect.any(String),
      messageHash: expect.any(String),
    })

    expect(secondResponse).toEqual({
      address: accountFromMnemonic.address,
      signature: expect.any(String),
      messageHash: expect.any(String),
    })

    expect(thirdResponse).toEqual({
      address: accountFromMnemonic.address,
      signature: expect.any(String),
      messageHash: expect.any(String),
    })
  })

  it.skip('Should be able to sign message with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSBitcoin(undefined, async () => transport)
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.ledgerService.getAccount(transport, 0)
    accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)

    const firstResponse = await walletConnectServiceBitcoin.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { account: account.address, message: 'My message' },
    })

    const secondResponse = await walletConnectServiceBitcoin.handlers.signMessage.process({
      account,
      method: 'signMessage',
      params: { account: account.address, address: accountFromMnemonic.address, message: 'My message' },
    })

    await transport.close()

    expect(firstResponse).toEqual({
      address: account.address,
      signature: expect.any(String),
      messageHash: expect.any(String),
    })

    expect(secondResponse).toEqual({
      address: accountFromMnemonic.address,
      signature: expect.any(String),
      messageHash: expect.any(String),
    })
  })

  it("Shouldn't be able to validate signPsbt with invalid params", async () => {
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64()
    await expect(walletConnectServiceBitcoin.handlers.signPsbt.validate({})).rejects.toThrow()
    await expect(walletConnectServiceBitcoin.handlers.signPsbt.validate({ account: 123, psbt })).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.signPsbt.validate({ account: account.address, psbt: 123 })
    ).rejects.toThrow()
  })

  it('Should be able to validate signPsbt params', async () => {
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64()
    const result = await walletConnectServiceBitcoin.handlers.signPsbt.validate({ account: account.address, psbt })
    expect(result).toEqual({ account: account.address, psbt })
  })

  it('Should be able to validate signPsbt params with optional fields', async () => {
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64()

    const params = {
      account: account.address,
      psbt,
      signInputs: [{ index: 0, address: account.address }],
      broadcast: false,
    }

    const result = await walletConnectServiceBitcoin.handlers.signPsbt.validate(params)
    expect(result).toEqual(params)
  })

  it("Shouldn't be able to sign PSBT with sender account different from account", async () => {
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.handlers.signPsbt.process({
        account,
        method: 'signPsbt',
        params: {
          account: accountFromMnemonic.address,
          psbt: new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64(),
          signInputs: [{ index: 0, address }],
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')

      return true
    })
  })

  it("Shouldn't be able to sign PSBT with invalid sign inputs", async () => {
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64()
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.handlers.signPsbt.process({
        account,
        method: 'signPsbt',
        params: {
          account: address,
          psbt,
          signInputs: [{ index: -1, address }],
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_INDEX')

      return true
    })

    await expect(
      walletConnectServiceBitcoin.handlers.signPsbt.process({
        account,
        method: 'signPsbt',
        params: {
          account: address,
          psbt,
          signInputs: [{ index: 0, address: undefined as any }],
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('ADDRESS_NOT_FOUND')

      return true
    })
  })

  it('Should be able to sign PSBT using Testnet', async () => {
    await buildTestnetData()

    const params = await buildSignPsbtTestnetParams()

    const response = await walletConnectServiceBitcoin.handlers.signPsbt.process({
      account,
      method: 'signPsbt',
      params: {
        account: account.address,
        ...params,
      },
    })

    expect(response).toEqual({ psbt: expect.any(String), txid: undefined })
  })

  it.skip('Should be able to sign PSBT with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    await buildTestnetData(transport)

    const params = await buildSignPsbtTestnetParams()

    const response = await walletConnectServiceBitcoin.handlers.signPsbt.process({
      account,
      method: 'signPsbt',
      params: {
        account: account.address,
        ...params,
      },
    })

    await transport.close()

    expect(response).toEqual({ psbt: expect.any(String), txid: undefined })
  })

  it.skip('Should be able to sign PSBT with broadcast using Testnet', async () => {
    await buildTestnetData()

    const params = await buildSignPsbtTestnetParams()

    const response = await walletConnectServiceBitcoin.handlers.signPsbt.process({
      account,
      method: 'signPsbt',
      params: {
        account: account.address,
        broadcast: true,
        ...params,
      },
    })

    expect(response).toEqual({ psbt: expect.any(String), txid: expect.any(String) })
  })

  it.skip('Should be able to sign PSBT with broadcast and Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    await buildTestnetData(transport)

    const params = await buildSignPsbtTestnetParams()

    const response = await walletConnectServiceBitcoin.handlers.signPsbt.process({
      account,
      method: 'signPsbt',
      params: {
        account: account.address,
        broadcast: true,
        ...params,
      },
    })

    await transport.close()

    expect(response).toEqual({ psbt: expect.any(String), txid: expect.any(String) })
  })

  it("Shouldn't be able to validate sendTransfer with invalid params", async () => {
    await expect(walletConnectServiceBitcoin.handlers.sendTransfer.validate({})).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.sendTransfer.validate({
        account: account.address,
        recipientAddress: accountFromMnemonic.address,
      })
    ).rejects.toThrow()
    await expect(
      walletConnectServiceBitcoin.handlers.sendTransfer.validate({
        account: account.address,
        recipientAddress: accountFromMnemonic.address,
        amount: 123,
      })
    ).rejects.toThrow()
  })

  it('Should be able to validate sendTransfer params', async () => {
    const params = {
      account: account.address,
      recipientAddress: accountFromMnemonic.address,
      amount: '10000',
    }

    const result = await walletConnectServiceBitcoin.handlers.sendTransfer.validate(params)
    expect(result).toEqual(params)
  })

  it('Should be able to validate sendTransfer params with optional fields', async () => {
    const params = {
      account: account.address,
      recipientAddress: accountFromMnemonic.address,
      amount: '10000',
      changeAddress: account.address,
      memo: 'test',
    }

    const result = await walletConnectServiceBitcoin.handlers.sendTransfer.validate(params)

    expect(result).toEqual(params)
  })

  it("Shouldn't be able to calculate request fee with invalid params", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        method: 'sendTransfer',
        params: 'invalid',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_PARAMS')

      return true
    })
  })

  it("Shouldn't be able to calculate request fee with a method different from 'sendTransfer'", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        method: 'signMessage',
        params: {},
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('UNSUPPORTED_METHOD')

      return true
    })
  })

  it("Shouldn't be able to calculate request fee with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        method: 'sendTransfer',
        params: {
          account: accountFromMnemonic.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')

      return true
    })
  })

  it("Shouldn't be able to calculate request fee with account different from change address", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        method: 'sendTransfer',
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          changeAddress: 'test',
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('ACCOUNT_SHOULD_BE_CHANGE_ADDRESS')

      return true
    })
  })

  it("Shouldn't be able to calculate request fee with memo", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        method: 'sendTransfer',
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
          memo: 'test',
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('MEMO_NOT_SUPPORTED')

      return true
    })
  })

  it('Should be able to calculate request fee using Testnet', async () => {
    await buildTestnetData()

    const fee = await walletConnectServiceBitcoin.calculateRequestFee({
      account,
      method: 'sendTransfer',
      params: {
        account: account.address,
        recipientAddress: accountFromMnemonic.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to calculate request fee with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    await buildTestnetData(transport)

    const fee = await walletConnectServiceBitcoin.calculateRequestFee({
      account,
      method: 'sendTransfer',
      params: {
        account: account.address,
        recipientAddress: accountFromMnemonic.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    await transport.close()

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it("Shouldn't be able to send transfer with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.handlers.sendTransfer.process({
        account,
        method: 'sendTransfer',
        params: {
          account: accountFromMnemonic.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')

      return true
    })
  })

  it("Shouldn't be able to send transfer with account different from change address", async () => {
    await expect(
      walletConnectServiceBitcoin.handlers.sendTransfer.process({
        account,
        method: 'sendTransfer',
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          changeAddress: 'test',
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('ACCOUNT_SHOULD_BE_CHANGE_ADDRESS')

      return true
    })
  })

  it("Shouldn't be able to send transfer with memo", async () => {
    await expect(
      walletConnectServiceBitcoin.handlers.sendTransfer.process({
        account,
        method: 'sendTransfer',
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
          memo: 'test',
        },
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('MEMO_NOT_SUPPORTED')

      return true
    })
  })

  it.skip('Should be able to send transfer using Testnet', async () => {
    await buildTestnetData()

    const response = await walletConnectServiceBitcoin.handlers.sendTransfer.process({
      account,
      method: 'sendTransfer',
      params: {
        account: account.address,
        recipientAddress: account.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    expect(response).toEqual({ txid: expect.any(String) })
  })

  it.skip('Should be able to send transfer with Ledger using Testnet', async () => {
    const transport = await TransportNodeHid.create()

    await buildTestnetData(transport)

    const response = await walletConnectServiceBitcoin.handlers.sendTransfer.process({
      account,
      method: 'sendTransfer',
      params: {
        account: account.address,
        recipientAddress: account.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    await transport.close()

    expect(response).toEqual({ txid: expect.any(String) })
  })
})
