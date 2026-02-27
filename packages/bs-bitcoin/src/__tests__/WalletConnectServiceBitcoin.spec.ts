import { BSBigNumber, BSBigNumberHelper, type TBSAccount } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { WalletConnectServiceBitcoin } from '../services/wallet-connect/WalletConnectServiceBitcoin'
import type { IBSBitcoin, TSignInput, TTatumUtxo, TTatumUtxosResponse } from '../types'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import { BSBitcoinTatumHelper } from '../helpers/BSBitcoinTatumHelper'
import * as bitcoinjs from 'bitcoinjs-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import Transport from '@ledgerhq/hw-transport'

const mainnetKey = process.env.TEST_MAINNET_PRIVATE_KEY
const testnetKey = process.env.TEST_TESTNET_PRIVATE_KEY
const mnemonic = process.env.TEST_MNEMONIC

let service: IBSBitcoin<'test'>
let walletConnectServiceBitcoin: WalletConnectServiceBitcoin<'test'>
let account: TBSAccount<'test'>
let accountFromMnemonic: TBSAccount<'test'>

const buildTestnetData = async (transport?: Transport) => {
  service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK, transport ? async () => transport : undefined)
  walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)

  account = await (transport
    ? service.ledgerService.getAccount(transport, 0)
    : service.generateAccountFromKey(testnetKey))

  accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)
}

const buildSignPsbtTestnetParams = async () => {
  const signInputs: TSignInput[] = []
  const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.testnet })
  const tatumApis = BSBitcoinTatumHelper.getApis(BSBitcoinConstants.TESTNET_NETWORK)

  let signInputIndex = 0
  let amount = BSBigNumberHelper.fromNumber('0')

  const { data } = await tatumApis.v4.get<TTatumUtxosResponse>('/data/utxos', {
    params: {
      address: account.address,
      chain: 'bitcoin-testnet',
      totalValue: 1_0000,
    },
  })

  const utxos = data.map<TTatumUtxo>(utxo => {
    const value = BSBigNumberHelper.fromNumber(utxo.valueAsString)
      .multipliedBy(BSBitcoinConstants.ONE_BTC_IN_SATOSHIS)
      .integerValue(BSBigNumber.ROUND_DOWN)

    return { ...utxo, valueAsString: value.toFixed(), value: value.toNumber() }
  })

  for (const utxo of utxos) {
    const { txHash, index, value, address } = utxo
    const transactionData = await service.blockchainDataService.getTransaction(txHash)
    const hex = transactionData.hex!
    const transaction = bitcoinjs.Transaction.fromHex(hex)
    const output = transaction.outs[index]

    const input: Parameters<bitcoinjs.Psbt['addInput']>[0] = {
      hash: txHash,
      index,
      nonWitnessUtxo: Buffer.from(hex, 'hex'),
      witnessUtxo: {
        script: output.script,
        value: BigInt(value),
      },
    }

    psbt.addInput(input)
    signInputs.push({ index: signInputIndex, address })

    amount = amount.plus(value)

    ++signInputIndex
  }

  psbt.addOutput({
    address: account.address,
    value: BigInt(amount.minus('200').toNumber()), // Amount and any fee
  })

  return { psbt: psbt.toBase64(), signInputs }
}

describe('WalletConnectServiceBitcoin', () => {
  beforeEach(async () => {
    service = new BSBitcoin('test')
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.generateAccountFromKey(mainnetKey)
    accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)
  })

  it("Shouldn't be able to get account addresses with no account", () => {
    expect(() => walletConnectServiceBitcoin.getAccountAddresses({ account, params: undefined })).toThrow(
      'Account not found'
    )
  })

  it("Shouldn't be able to get account addresses with sender account different from account", () => {
    expect(() =>
      walletConnectServiceBitcoin.getAccountAddresses({ account, params: { account: accountFromMnemonic.address } })
    ).toThrow('Sender account should be equal account')
  })

  it("Shouldn't be able to get account addresses with intentions not supported", () => {
    expect(() =>
      walletConnectServiceBitcoin.getAccountAddresses({
        account,
        params: {
          account: account.address,
          intentions: ['ordinal'],
        },
      })
    ).toThrow('Intentions not supported')

    expect(() =>
      walletConnectServiceBitcoin.getAccountAddresses({
        account,
        params: {
          account: account.address,
          intentions: ['payment', 'ordinal'],
        },
      })
    ).toThrow('Intentions not supported')
  })

  it('Should be able to get accounts address', () => {
    const accountsResponse = [
      { address: account.address, publicKey: expect.any(String), path: account.bipPath, intention: 'payment' },
    ]

    const firstAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address },
    })

    const secondAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address, intentions: [] },
    })

    const thirdAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address, intentions: ['payment'] },
    })

    const fourthAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account: accountFromMnemonic,
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

    service = new BSBitcoin('test', undefined, async () => transport)
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.ledgerService.getAccount(transport, 0)

    const accountsResponse = [
      { address: account.address, publicKey: undefined, path: account.bipPath, intention: 'payment' },
    ]

    const firstAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address },
    })

    const secondAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address, intentions: [] },
    })

    const thirdAccounts = walletConnectServiceBitcoin.getAccountAddresses({
      account,
      params: { account: account.address, intentions: ['payment'] },
    })

    await transport.close()

    expect(firstAccounts).toEqual(accountsResponse)
    expect(secondAccounts).toEqual(accountsResponse)
    expect(thirdAccounts).toEqual(accountsResponse)
  })

  it("Shouldn't be able to sign message with no account", async () => {
    await expect(
      walletConnectServiceBitcoin.signMessage({
        account,
        params: { message: 'My message' },
      })
    ).rejects.toThrow('Account not found')
  })

  it("Shouldn't be able to sign message with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.signMessage({
        account,
        params: {
          account: accountFromMnemonic.address,
          message: 'My message',
        },
      })
    ).rejects.toThrow('Sender account be equal account')
  })

  it("Shouldn't be able to sign message with no message", async () => {
    await expect(
      walletConnectServiceBitcoin.signMessage({
        account,
        params: { account: account.address },
      })
    ).rejects.toThrow('Invalid message')
  })

  it("Shouldn't be able to sign message with protocol not supported", async () => {
    await expect(
      walletConnectServiceBitcoin.signMessage({
        account,
        params: {
          account: account.address,
          message: 'My message',
          protocol: 'invalid',
        },
      })
    ).rejects.toThrow('Protocol not supported')
  })

  it('Should be able to sign message', async () => {
    const firstResponse = await walletConnectServiceBitcoin.signMessage({
      account,
      params: {
        account: account.address,
        message: 'My message',
      },
    })

    const secondResponse = await walletConnectServiceBitcoin.signMessage({
      account,
      params: {
        account: account.address,
        address: accountFromMnemonic.address,
        message: 'My message',
      },
    })

    const thirdResponse = await walletConnectServiceBitcoin.signMessage({
      account: accountFromMnemonic,
      params: {
        account: accountFromMnemonic.address,
        message: 'My message',
      },
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

    service = new BSBitcoin('test', undefined, async () => transport)
    walletConnectServiceBitcoin = new WalletConnectServiceBitcoin(service)
    account = await service.ledgerService.getAccount(transport, 0)
    accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 0)

    const firstResponse = await walletConnectServiceBitcoin.signMessage({
      account,
      params: {
        account: account.address,
        message: 'My message',
      },
    })

    const secondResponse = await walletConnectServiceBitcoin.signMessage({
      account,
      params: {
        account: account.address,
        address: accountFromMnemonic.address,
        message: 'My message',
      },
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

  it("Shouldn't be able to calculate request fee with no account", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Account not found')
  })

  it("Shouldn't be able to calculate request fee with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          account: accountFromMnemonic.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Sender account be equal account')
  })

  it("Shouldn't be able to calculate request fee with account different from change address", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          changeAddress: 'test',
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Account should be equal change address')
  })

  it("Shouldn't be able to calculate request fee with memo", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
          memo: 'test',
        },
      })
    ).rejects.toThrow('Memo not supported')
  })

  it("Shouldn't be able to calculate request fee with no recipient address", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          account: account.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Recipient address not found')
  })

  it("Shouldn't be able to calculate request fee with no amount", async () => {
    await expect(
      walletConnectServiceBitcoin.calculateRequestFee({
        account,
        params: {
          account: account.address,
          recipientAddress: account.address,
        },
      })
    ).rejects.toThrow('Amount not found')
  })

  it.skip('Should be able to calculate request fee using Testnet', async () => {
    await buildTestnetData()

    const fee = await walletConnectServiceBitcoin.calculateRequestFee({
      account,
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
      params: {
        account: account.address,
        recipientAddress: accountFromMnemonic.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    await transport.close()

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })

  it("Shouldn't be able to send transfer with no account", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Account not found')
  })

  it("Shouldn't be able to send transfer with sender account different from account", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          account: accountFromMnemonic.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Sender account be equal account')
  })

  it("Shouldn't be able to send transfer with account different from change address", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          changeAddress: 'test',
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Account should be equal change address')
  })

  it("Shouldn't be able to send transfer with memo", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          account: account.address,
          recipientAddress: accountFromMnemonic.address,
          amount: '10000', // No decimals, the amount is 0.0001
          memo: 'test',
        },
      })
    ).rejects.toThrow('Memo not supported')
  })

  it("Shouldn't be able to send transfer with no recipient address", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          account: account.address,
          amount: '10000', // No decimals, the amount is 0.0001
        },
      })
    ).rejects.toThrow('Recipient address not found')
  })

  it("Shouldn't be able to send transfer fee with no amount", async () => {
    await expect(
      walletConnectServiceBitcoin.sendTransfer({
        account,
        params: {
          account: account.address,
          recipientAddress: account.address,
        },
      })
    ).rejects.toThrow('Amount not found')
  })

  it.skip('Should be able to send transfer using Testnet', async () => {
    await buildTestnetData()

    const response = await walletConnectServiceBitcoin.sendTransfer({
      account,
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

    const response = await walletConnectServiceBitcoin.sendTransfer({
      account,
      params: {
        account: account.address,
        recipientAddress: account.address,
        amount: '10000', // No decimals, the amount is 0.0001
      },
    })

    await transport.close()

    expect(response).toEqual({ txid: expect.any(String) })
  })

  it("Shouldn't be able to sign PSBT with no account", async () => {
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.signPsbt({
        account,
        params: {
          psbt: new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64(),
          signInputs: [{ index: 0, address }],
        },
      })
    ).rejects.toThrow('Account not found')
  })

  it("Shouldn't be able to sign PSBT with sender account different from account", async () => {
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.signPsbt({
        account,
        params: {
          account: accountFromMnemonic.address,
          psbt: new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64(),
          signInputs: [{ index: 0, address }],
        },
      })
    ).rejects.toThrow('Sender account should be equal account')
  })

  it("Shouldn't be able to sign PSBT with no PSBT", async () => {
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.signPsbt({
        account,
        params: {
          account: address,
          signInputs: [{ index: 0, address }],
        },
      })
    ).rejects.toThrow('PSBT not found')
  })

  it("Shouldn't be able to sign PSBT with invalid sign inputs", async () => {
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.bitcoin }).toBase64()
    const { address } = account

    await expect(
      walletConnectServiceBitcoin.signPsbt({
        account,
        params: {
          account: address,
          psbt,
          signInputs: [{ index: -1, address }],
        },
      })
    ).rejects.toThrow('Invalid index')

    await expect(
      walletConnectServiceBitcoin.signPsbt({
        account,
        params: {
          account: address,
          psbt,
          signInputs: [{ index: 0, address: undefined }],
        },
      })
    ).rejects.toThrow('Address not found')
  })

  it.skip('Should be able to sign PSBT using Testnet', async () => {
    await buildTestnetData()

    const params = await buildSignPsbtTestnetParams()

    const response = await walletConnectServiceBitcoin.signPsbt({
      account,
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

    const response = await walletConnectServiceBitcoin.signPsbt({
      account,
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

    const response = await walletConnectServiceBitcoin.signPsbt({
      account,
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

    const response = await walletConnectServiceBitcoin.signPsbt({
      account,
      params: {
        account: account.address,
        broadcast: true,
        ...params,
      },
    })

    await transport.close()

    expect(response).toEqual({ psbt: expect.any(String), txid: expect.any(String) })
  })
})
