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
import type { IBSSolana } from '../../types'
import * as solanaKit from '@solana/kit'
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
    const bipPathWithoutMasterKey = BSKeychainHelper.removeMasterKeyFromBipPath(bipPath)

    const address = await BSUtilsHelper.retry(async () => {
      const response = await ledgerApp.getAddress(bipPathWithoutMasterKey)

      return solanaKit.getBase58Decoder().decode(response.address)
    })

    return {
      address,
      key: address,
      type: 'publicKey',
      bipPath,
      isHardware: true,
      blockchain: this.#service.name,
    }
  }

  async signTransaction(
    transport: Transport,
    transaction: solanaKit.Transaction,
    account: TBSAccount<N>
  ): Promise<solanaKit.Base64EncodedWireTransaction> {
    if (!account.bipPath) throw new Error('TBSAccount must have bip44Path to sign with Ledger')

    const ledgerApp = new LedgerSolanaApp(transport)

    this.emitter?.emit('getSignatureStart')

    const bip44Path = BSKeychainHelper.removeMasterKeyFromBipPath(account.bipPath)
    const { signature } = await ledgerApp.signTransaction(bip44Path, Buffer.from(transaction.messageBytes))

    this.emitter?.emit('getSignatureEnd')

    const signedTransaction: solanaKit.Transaction = {
      ...transaction,
      signatures: {
        ...transaction.signatures,
        [account.address]: signature,
      },
    }

    return solanaKit.getBase64EncodedWireTransaction(signedTransaction)
  }
}
