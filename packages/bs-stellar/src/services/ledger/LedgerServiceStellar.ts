import {
  BSError,
  BSKeychainHelper,
  BSUtilsHelper,
  generateAccountForBlockchainService,
  type ILedgerService,
  type TBSAccount,
  type TGetLedgerTransport,
  type TLedgerServiceEmitter,
  type TUntilIndexRecord,
} from '@cityofzion/blockchain-service'
import EventEmitter from 'events'
import type { IBSStellar } from '../../types'
import Transport from '@ledgerhq/hw-transport'
import LedgerStellarApp from '@ledgerhq/hw-app-str'
import * as stellarSDK from '@stellar/stellar-sdk'

export class LedgerServiceStellar<N extends string = string> implements ILedgerService<N> {
  readonly emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter
  getLedgerTransport?: TGetLedgerTransport<N> | undefined

  readonly #service: IBSStellar<N>

  constructor(service: IBSStellar<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#service = service
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccounts(
    transport: Transport,
    untilIndexByBlockchainService?: TUntilIndexRecord<N>
  ): Promise<TBSAccount<N>[]> {
    const accountsByBlockchainService = await generateAccountForBlockchainService(
      [this.#service],
      async (_service, index) => {
        return this.getAccount(transport, index)
      },
      untilIndexByBlockchainService
    )

    const accounts = accountsByBlockchainService.get(this.#service.name)
    return accounts ?? []
  }

  async getAccount(transport: Transport, index: number): Promise<TBSAccount<N>> {
    const ledgerApp = new LedgerStellarApp(transport)
    const bip44Path = BSKeychainHelper.getBip44Path(
      BSKeychainHelper.fixBip44Path(this.#service.bip44DerivationPath),
      index
    )

    const publicKeychain = await BSUtilsHelper.retry(async () => {
      const { rawPublicKey } = await ledgerApp.getPublicKey(bip44Path)
      const publicKeyStr = stellarSDK.StrKey.encodeEd25519PublicKey(rawPublicKey)
      return stellarSDK.Keypair.fromPublicKey(publicKeyStr)
    })

    const publicKey = publicKeychain.publicKey()

    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      bip44Path,
      isHardware: true,
      blockchain: this.#service.name,
    }
  }

  async signTransaction(transport: Transport, transaction: stellarSDK.Transaction, account: TBSAccount<N>) {
    if (!account.bip44Path)
      throw new BSError('TBSAccount must have bip44Path to sign with Ledger', 'INVALID_HARDWARE_ACCOUNT')

    const ledgerApp = new LedgerStellarApp(transport)
    const signatureBase = transaction.signatureBase()

    this.emitter?.emit('getSignatureStart')

    const bip44Path = BSKeychainHelper.fixBip44Path(account.bip44Path)
    const { signature } = await ledgerApp.signTransaction(bip44Path, signatureBase)

    this.emitter?.emit('getSignatureEnd')

    transaction.addSignature(account.address, signature.toString('base64'))

    return transaction
  }
}
