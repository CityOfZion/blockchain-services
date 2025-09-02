import {
  Account,
  LedgerService,
  LedgerServiceEmitter,
  GetLedgerTransport,
  UntilIndexRecord,
  generateAccountForBlockchainService,
  BSUtilsHelper,
} from '@cityofzion/blockchain-service'
import LedgerSolanaApp from '@ledgerhq/hw-app-solana'
import EventEmitter from 'events'
import { BSSolana } from '../../BSSolana'
import Transport from '@ledgerhq/hw-transport'
import solanaSDK from '@solana/web3.js'
import { BSSolanaHelper } from '../../helpers/BSSolanaHelper'

export class Web3LedgerServiceSolana<BSName extends string = string> implements LedgerService<BSName> {
  #blockchainService: BSSolana<BSName>
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter
  getLedgerTransport?: GetLedgerTransport<BSName>

  constructor(blockchainService: BSSolana<BSName>, getLedgerTransport?: GetLedgerTransport<BSName>) {
    this.#blockchainService = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccounts(
    transport: Transport,
    untilIndexByBlockchainService?: UntilIndexRecord<BSName>
  ): Promise<Account<BSName>[]> {
    const accountsByBlockchainService = await generateAccountForBlockchainService(
      [this.#blockchainService],
      async (_service, index) => {
        return this.getAccount(transport, index)
      },
      untilIndexByBlockchainService
    )

    const accounts = accountsByBlockchainService.get(this.#blockchainService.name)
    return accounts ?? []
  }

  async getAccount(transport: Transport, index: number): Promise<Account<BSName>> {
    const ledgerApp = new LedgerSolanaApp(transport)
    const bip44Path = BSSolanaHelper.getBip44Path(this.#blockchainService.bip44DerivationPath, index)

    const publicKey = await BSUtilsHelper.retry(async () => {
      const response = await ledgerApp.getAddress(bip44Path)
      return new solanaSDK.PublicKey(response.address)
    })

    const address = publicKey.toBase58()

    return {
      address,
      key: address,
      type: 'publicKey',
      bip44Path,
      isHardware: true,
      blockchain: this.#blockchainService.name,
    }
  }

  async signTransaction(transport: Transport, transaction: solanaSDK.Transaction, account: Account<BSName>) {
    if (!account.bip44Path) throw new Error('Account must have bip44Path to sign with Ledger')

    const ledgerApp = new LedgerSolanaApp(transport)
    const serializedTransaction = transaction.compileMessage().serialize()

    this.emitter?.emit('getSignatureStart')

    const bip44Path = BSSolanaHelper.fixBip44Path(account.bip44Path)
    const { signature } = await ledgerApp.signTransaction(bip44Path, serializedTransaction)

    this.emitter?.emit('getSignatureEnd')

    transaction.addSignature(new solanaSDK.PublicKey(account.address), signature)
    return transaction.serialize()
  }
}
