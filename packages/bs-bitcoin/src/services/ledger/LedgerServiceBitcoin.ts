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
import type { IBSBitcoin } from '../../types'
import EventEmitter from 'events'
import Transport from '@ledgerhq/hw-transport'
import * as bitcoinjs from 'bitcoinjs-lib'
import type { Transaction } from '@ledgerhq/hw-app-btc/types'

export class LedgerServiceBitcoin<N extends string = string> implements ILedgerService<N> {
  readonly #service: IBSBitcoin<N>
  readonly getLedgerTransport?: TGetLedgerTransport<N>

  emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter

  constructor(service: IBSBitcoin<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#service = service
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccount(transport: Transport, index: number): Promise<TBSAccount<N>> {
    const ledgerApp = new BitcoinLedgerApp({ transport })
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

  async signTransaction(psbt: bitcoinjs.Psbt, account: TBSAccount<N>, transport: Transport): Promise<void> {
    try {
      const ledgerApp = new BitcoinLedgerApp({ transport })
      const bipPathWithoutMasterKey = BSKeychainHelper.removeMasterKeyFromBipPath(account.bipPath!)
      const inputs: [Transaction, number, null, null][] = []

      psbt.data.inputs.map((input, index) => {
        const txInput = psbt.txInputs[index]
        const transactionHex = Buffer.from(input.nonWitnessUtxo!).toString('hex')
        const splitTransaction = ledgerApp.splitTransaction(transactionHex, true)

        inputs.push([splitTransaction, txInput.index, null, null])
      })

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
}
