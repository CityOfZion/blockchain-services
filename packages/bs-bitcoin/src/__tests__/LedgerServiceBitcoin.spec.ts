import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import type { IBSBitcoin, TTatumTransactionResponse, TTatumUtxo, TTatumUtxosResponse } from '../types'
import { BSBigNumber, BSBigNumberHelper, BSKeychainHelper, type ILedgerService } from '@cityofzion/blockchain-service'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import { BSBitcoin } from '../BSBitcoin'
import { LedgerServiceBitcoin } from '../services/ledger/LedgerServiceBitcoin'
import * as bitcoinjs from 'bitcoinjs-lib'
import { BSBitcoinTatumHelper } from '../helpers/BSBitcoinTatumHelper'

const blockchain = 'test'

let service: IBSBitcoin<'test'>
let ledgerService: ILedgerService<'test'>
let transport: Transport
let getLedgerTransport: () => Promise<Transport>

describe.skip('LedgerServiceBitcoin', () => {
  beforeEach(async () => {
    if (transport) await transport.close()

    transport = await TransportNodeHid.create()

    getLedgerTransport = async () => transport

    service = new BSBitcoin(blockchain, undefined, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)
  })

  it.skip('Should be able to get all accounts automatically', async () => {
    const accounts = await ledgerService.getAccounts(transport)

    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get all accounts until index', async () => {
    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      test: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)

    expect(account).toEqual({
      address: expect.any(String),
      key: expect.any(String),
      type: 'publicKey',
      bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
      isHardware: true,
      blockchain,
    })
  })

  it.skip('Should be able to get all accounts automatically using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const accounts = await ledgerService.getAccounts(transport)

    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get all accounts until index using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      test: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get account using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const account = await ledgerService.getAccount(transport, 0)

    expect(account).toEqual({
      address: expect.any(String),
      key: expect.any(String),
      type: 'publicKey',
      bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
      isHardware: true,
      blockchain,
    })
  })

  it.skip('Should be able to sign transaction using Testnet', async () => {
    const network = BSBitcoinConstants.TESTNET_NETWORK

    service = new BSBitcoin(blockchain, network, getLedgerTransport)

    const ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)
    const account = await ledgerService.getAccount(transport, 0)
    const tatumApis = BSBitcoinTatumHelper.getApis(network)
    const psbt = new bitcoinjs.Psbt({ network: bitcoinjs.networks.testnet })

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

      return {
        ...utxo,
        valueAsString: value.toFixed(),
        value: value.toNumber(),
      }
    })

    for (const utxo of utxos) {
      const { txHash, index, value } = utxo
      const response = await tatumApis.v3.get<TTatumTransactionResponse>(`/bitcoin/transaction/${txHash}`)
      const { hex } = response.data
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
    }

    await expect(ledgerService.signTransaction(psbt, account, transport)).resolves.not.toThrow()
  })
})
