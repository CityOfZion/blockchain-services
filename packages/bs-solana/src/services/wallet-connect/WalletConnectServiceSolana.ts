import {
  BSBigNumberHelper,
  type IWalletConnectService,
  type TWalletConnectServiceRequestMethodParams,
  type TBSAccount,
} from '@cityofzion/blockchain-service'
import type { IBSSolana, TBSSolanaNetworkId } from '../../types'
import { createPrivateKey, sign } from 'crypto'
import { Transaction, VersionedTransaction, type Message, type VersionedMessage } from '@solana/web3.js'
import bs58 from 'bs58'

export class WalletConnectServiceSolana<N extends string> implements IWalletConnectService<N> {
  static networkIdByNetworkType: Record<TBSSolanaNetworkId, string> = {
    'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  }

  readonly namespace = 'solana'
  readonly chain: string
  readonly supportedMethods: string[] = []
  readonly supportedEvents: string[] = []
  readonly calculableMethods: string[] = []
  readonly autoApproveMethods: string[] = []

  readonly #service: IBSSolana<N>

  constructor(service: IBSSolana<N>) {
    this.#service = service

    const networkId = WalletConnectServiceSolana.networkIdByNetworkType[this.#service.network.type]

    this.chain = `${this.namespace}:${networkId}`
  }

  #parseTransaction(encodedTransaction: string) {
    const buffer = Buffer.from(encodedTransaction, 'base64')
    let transaction: Transaction | VersionedTransaction

    // Versioned tx starts with version byte >= 0x80
    if (buffer[0] & 0x80) {
      transaction = VersionedTransaction.deserialize(buffer)
    } else {
      transaction = Transaction.from(buffer)
    }

    return transaction
  }

  #signTransaction(encodedTransaction: string, account: TBSAccount<N>) {
    const transaction = this.#parseTransaction(encodedTransaction)

    const keypair = this.#service.generateKeyPairFromKey(account.key)

    // Versioned tx starts with version byte >= 0x80
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair])
    } else {
      if (transaction.feePayer && transaction.feePayer.toBase58() !== keypair.publicKey.toBase58()) {
        throw new Error('Fee payer does not match account address')
      }

      transaction.partialSign(keypair)
    }

    return transaction
  }

  [methodName: string]: any

  async solana_getAccounts(args: TWalletConnectServiceRequestMethodParams<N>) {
    const keypair = this.#service.generateKeyPairFromKey(args.account.key)
    return [{ pubkey: keypair.publicKey.toBase58() }]
  }

  async solana_requestAccounts(args: TWalletConnectServiceRequestMethodParams<N>) {
    return await this.solana_getAccounts(args)
  }

  async solana_signMessage(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.message !== 'string' || typeof args.params.pubKey !== 'string') {
      throw new Error('Invalid params')
    }

    if (args.params.pubKey !== args.account.address) {
      throw new Error('Public key does not match account address')
    }

    const messageBytes = bs58.decode(args.params.message)

    const keypair = this.#service.generateKeyPairFromKey(args.account.key)

    const seed = keypair.secretKey.slice(0, 32)

    const privateKey = createPrivateKey({
      key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
      format: 'der',
      type: 'pkcs8',
    })

    const signature = sign(null, messageBytes, privateKey)

    return { signature: bs58.encode(signature) }
  }

  async solana_signTransaction(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const transaction = this.#signTransaction(args.params.transaction, args.account)

    return { transaction: transaction.serialize().toString('base64') }
  }

  async solana_signAllTransactions(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (!Array.isArray(args.params.transactions)) {
      throw new Error('Invalid params')
    }

    const signedTransactions = args.params.transactions.map((transaction: string) =>
      this.#signTransaction(transaction, args.account).serialize().toString('base64')
    )

    return {
      transactions: signedTransactions,
    }
  }

  async solana_signAndSendTransaction(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const options = args.params.sendOptions ?? {}

    const signedTransaction = this.#signTransaction(args.params.transaction, args.account)

    const signature = await this.#service.connection.sendRawTransaction(signedTransaction.serialize(), {
      maxRetries: options.maxRetries,
      preflightCommitment: options.preflightCommitment,
      minContextSlot: options.minContextSlot,
      skipPreflight: options.skipPreflight,
    })

    return { signature }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const transaction = this.#parseTransaction(args.params.transaction)

    let message: VersionedMessage | Message

    if (transaction instanceof Transaction) {
      const { blockhash } = await this.#service.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      message = transaction.compileMessage()
    } else {
      message = transaction.message
    }

    const fee = await this.#service.connection.getFeeForMessage(message)
    if (!fee.value) {
      throw new Error('Failed to calculate fee')
    }

    const feeBn = BSBigNumberHelper.fromDecimals(fee.value, this.#service.feeToken.decimals)
    return BSBigNumberHelper.toNumber(feeBn).toString()
  }
}
