import {
  BSKeychainHelper,
  BSUtilsHelper,
  generateAccountForBlockchainService,
  type ILedgerService,
  type TBSAccount,
  type TGetLedgerTransport,
  type TLedgerServiceEmitter,
  type TUntilIndexRecord,
} from '@cityofzion/blockchain-service'
import BitcoinLedgerApp from '@ledgerhq/hw-app-btc'
import type {
  IBSBitcoin,
  TLedgerServiceBitcoinGetTransactionHexParams,
  TLedgerServiceBitcoinSignMessageParams,
  TLedgerServiceBitcoinSignMessageResponse,
  TLedgerServiceBitcoinSignTransactionParams,
} from '../../types'
import EventEmitter from 'events'
import Transport from '@ledgerhq/hw-transport'
import type { Transaction } from '@ledgerhq/hw-app-btc/types'
import * as bitcoinjs from 'bitcoinjs-lib'
import * as bitcoinjsMessage from 'bitcoinjs-message'

export class LedgerServiceBitcoin<N extends string = string> implements ILedgerService<N> {
  readonly #service: IBSBitcoin<N>
  readonly getLedgerTransport?: TGetLedgerTransport<N>

  emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter

  constructor(service: IBSBitcoin<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#service = service
    this.getLedgerTransport = getLedgerTransport
  }

  #getLedgerApp(transport: Transport) {
    return new BitcoinLedgerApp({
      transport,
      currency: this.#service.network.type === 'mainnet' ? 'bitcoin' : 'bitcoin_testnet',
    })
  }

  async #getTransactionHex({ hash, nonWitnessUtxo }: TLedgerServiceBitcoinGetTransactionHexParams): Promise<string> {
    if (nonWitnessUtxo) {
      return Buffer.from(nonWitnessUtxo).toString('hex')
    } else {
      const transactionId = Buffer.from(hash).reverse().toString('hex')
      const transaction = await this.#service.blockchainDataService.getTransaction(transactionId)

      return transaction.hex!
    }
  }

  async getAccount(transport: Transport, index: number): Promise<TBSAccount<N>> {
    const ledgerApp = this.#getLedgerApp(transport)
    const bipPath = BSKeychainHelper.getBipPath(this.#service.bipDerivationPath, index)
    const bipPathWithoutMasterKey = BSKeychainHelper.removeMasterKeyFromBipPath(bipPath)

    const { bitcoinAddress } = await BSUtilsHelper.retry(
      () => ledgerApp.getWalletPublicKey(bipPathWithoutMasterKey, { format: 'bech32' }),
      {
        retries: 10,
        delay: 500,
        shouldRetry: (error: any) => ['TransportStatusError', 'LockedDeviceError'].includes(error?.name),
      }
    )

    return {
      address: bitcoinAddress,
      key: bitcoinAddress,
      type: 'publicKey',
      bipPath,
      isHardware: true,
      blockchain: this.#service.name,
    }
  }

  async getAccounts(
    transport: Transport,
    untilIndexByBlockchainService?: TUntilIndexRecord<N>
  ): Promise<TBSAccount<N>[]> {
    const accountsByBlockchainServices = await generateAccountForBlockchainService(
      [this.#service],
      (_service, index) => this.getAccount(transport, index),
      untilIndexByBlockchainService
    )

    return accountsByBlockchainServices.get(this.#service.name) || []
  }

  async signTransaction({
    psbt,
    account,
    transport,
    signInputs,
  }: TLedgerServiceBitcoinSignTransactionParams<N>): Promise<void> {
    try {
      const ledgerApp = this.#getLedgerApp(transport)
      const bipPathWithoutMasterKey = BSKeychainHelper.removeMasterKeyFromBipPath(account.bipPath!)
      const psbtInputs = psbt.data.inputs
      const inputs: [Transaction, number, null, null][] = []
      let promises: Promise<void>[]

      if (signInputs && signInputs.length > 0) {
        promises = signInputs.map(async (input, index) => {
          const inputIndex = input.index
          const transactionInput = psbt.txInputs[inputIndex]
          const { nonWitnessUtxo } = psbtInputs[inputIndex]
          const transactionHex = await this.#getTransactionHex({ hash: transactionInput.hash, nonWitnessUtxo })
          const splitTransaction = ledgerApp.splitTransaction(transactionHex, true)

          inputs.splice(index, 0, [splitTransaction, transactionInput.index, null, null])
        })
      } else {
        promises = psbtInputs.map(async (input, index) => {
          const transactionInput = psbt.txInputs[index]
          const { nonWitnessUtxo } = input
          const transactionHex = await this.#getTransactionHex({ hash: transactionInput.hash, nonWitnessUtxo })
          const splitTransaction = ledgerApp.splitTransaction(transactionHex, true)

          inputs.splice(index, 0, [splitTransaction, transactionInput.index, null, null])
        })
      }

      await Promise.allSettled(promises)

      const transaction = bitcoinjs.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
      const splitTransaction = ledgerApp.splitTransaction(transaction.toHex(), true)
      const outputScriptHex = ledgerApp.serializeTransactionOutputs(splitTransaction).toString('hex')

      this.emitter.emit('getSignatureStart')

      const signedTransactionHex = await ledgerApp.createPaymentTransaction({
        inputs,
        associatedKeysets: new Array(inputs.length).fill(bipPathWithoutMasterKey),
        outputScriptHex,
        segwit: true,
        additionals: ['bech32'],
      })

      const signedTransaction = bitcoinjs.Transaction.fromHex(signedTransactionHex)

      inputs.forEach((_, index) => {
        const [signature, pubkey] = signedTransaction.ins[index].witness

        if (signature && pubkey) {
          psbt.updateInput(index, { partialSig: [{ pubkey, signature }] })
        }
      })
    } finally {
      this.emitter.emit('getSignatureEnd')
    }
  }

  async signMessage({
    message,
    account,
    transport,
  }: TLedgerServiceBitcoinSignMessageParams<N>): Promise<TLedgerServiceBitcoinSignMessageResponse> {
    try {
      const ledgerApp = this.#getLedgerApp(transport)
      const bipPathWithoutMasterKey = BSKeychainHelper.removeMasterKeyFromBipPath(account.bipPath!)
      const messageBuffer = Buffer.from(message, BSUtilsHelper.isBase64(message) ? 'base64' : 'utf8')
      const messageHex = messageBuffer.toString('hex')

      this.emitter.emit('getSignatureStart')

      const { v, r, s } = await ledgerApp.signMessage(bipPathWithoutMasterKey, messageHex)
      const { address } = account
      const isP2WPKHAddress = this.#service.isP2WPKHAddress(address)
      const messageHash = bitcoinjsMessage.magicHash(messageBuffer)

      const signature = Buffer.concat([
        Buffer.from([v + (isP2WPKHAddress ? 31 : 27)]),
        Buffer.from(r, 'hex'),
        Buffer.from(s, 'hex'),
      ])

      bitcoinjsMessage.verify(messageBuffer, address, signature, undefined, isP2WPKHAddress)

      return {
        signature: signature.toString('hex'),
        messageHash: messageHash.toString('hex'),
      }
    } finally {
      this.emitter.emit('getSignatureEnd')
    }
  }
}
