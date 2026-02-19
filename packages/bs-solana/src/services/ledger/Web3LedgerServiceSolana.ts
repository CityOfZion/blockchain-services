import {
  BSUtilsHelper,
  BSKeychainHelper,
  generateAccountForBlockchainService,
  type TBSAccount,
  type TLedgerServiceEmitter,
  type TGetLedgerTransport,
  type TUntilIndexRecord,
  type ILedgerService,
} from '@cityofzion/blockchain-service'
import LedgerSolanaApp from '@ledgerhq/hw-app-solana'
import EventEmitter from 'events'
import Transport from '@ledgerhq/hw-transport'
import solanaSDK from '@solana/web3.js'
import type { IBSSolana } from '../../types'

export class Web3LedgerServiceSolana<N extends string = string> implements ILedgerService<N> {
  readonly #service: IBSSolana<N>
  readonly getLedgerTransport?: TGetLedgerTransport<N>

  emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter

  constructor(blockchainService: IBSSolana<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#service = blockchainService
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
    const ledgerApp = new LedgerSolanaApp(transport)
    const bipPath = BSKeychainHelper.getBipPath(this.#service.bipDerivationPath, index)

    const publicKey = await BSUtilsHelper.retry(async () => {
      const response = await ledgerApp.getAddress(BSKeychainHelper.removeMasterKeyFromBipPath(bipPath))

      return new solanaSDK.PublicKey(response.address)
    })

    const address = publicKey.toBase58()

    return {
      address,
      key: address,
      type: 'publicKey',
      bipPath,
      isHardware: true,
      blockchain: this.#service.name,
    }
  }

  async signTransaction(transport: Transport, transaction: solanaSDK.Transaction, account: TBSAccount<N>) {
    if (!account.bipPath) throw new Error('TBSAccount must have bip44Path to sign with Ledger')

    const ledgerApp = new LedgerSolanaApp(transport)
    const serializedTransaction = transaction.compileMessage().serialize()

    this.emitter?.emit('getSignatureStart')

    const bip44Path = BSKeychainHelper.removeMasterKeyFromBipPath(account.bipPath)
    const { signature } = await ledgerApp.signTransaction(bip44Path, serializedTransaction)

    this.emitter?.emit('getSignatureEnd')

    transaction.addSignature(new solanaSDK.PublicKey(account.address), signature)
    return transaction.serialize()
  }
}
