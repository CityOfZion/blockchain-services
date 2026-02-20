import {
  type IWalletConnectService,
  type TWalletConnectServiceRequestMethodParams,
  BSBigNumberHelper,
} from '@cityofzion/blockchain-service'
import type { IBSSolana, TBSSolanaNetworkId } from '../../types'
import * as solanaKit from '@solana/kit'
export class WalletConnectServiceSolana<N extends string> implements IWalletConnectService<N> {
  static networkIdByNetworkType: Record<TBSSolanaNetworkId, string> = {
    'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  }

  readonly namespace = 'solana'
  readonly chain: string
  readonly supportedMethods: string[] = [
    'solana_getAccounts',
    'solana_requestAccounts',
    'solana_signMessage',
    'solana_signTransaction',
    'solana_signAllTransactions',
    'solana_signAndSendTransaction',
  ]
  readonly supportedEvents: string[] = []
  readonly calculableMethods: string[] = ['solana_signAndSendTransaction']
  readonly autoApproveMethods: string[] = ['solana_getAccounts', 'solana_requestAccounts']

  readonly #service: IBSSolana<N>

  constructor(service: IBSSolana<N>) {
    this.#service = service

    const networkId = WalletConnectServiceSolana.networkIdByNetworkType[this.#service.network.id]

    this.chain = `${this.namespace}:${networkId}`
  }

  #parseTransaction(encodedTransaction: string) {
    const transactionBytes = solanaKit.getBase64Encoder().encode(encodedTransaction)
    const transaction = solanaKit.getTransactionCodec().decode(transactionBytes)

    return transaction
  }

  [methodName: string]: any

  async solana_getAccounts(args: TWalletConnectServiceRequestMethodParams<N>): Promise<{ pubkey: string }[]> {
    return [{ pubkey: args.account.address }]
  }

  async solana_requestAccounts(args: TWalletConnectServiceRequestMethodParams<N>) {
    return await this.solana_getAccounts(args)
  }

  async solana_signMessage(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.message !== 'string' || typeof args.params.pubkey !== 'string') {
      throw new Error('Invalid params')
    }

    if (args.params.pubkey !== args.account.address) {
      throw new Error('Public key does not match account address')
    }

    const messageBytes = solanaKit.getBase58Codec().encode(args.params.message)

    const keypair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(args.account.key))

    const signatureBuffer = await crypto.subtle.sign('Ed25519', keypair.privateKey, new Uint8Array(messageBytes))

    const signature = solanaKit.getBase58Codec().decode(new Uint8Array(signatureBuffer))

    return { signature }
  }

  async solana_signTransaction(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const parsedTransaction = this.#parseTransaction(args.params.transaction)

    const signedTransaction = await this.#service.signTransaction(parsedTransaction, args.account)

    return { transaction: signedTransaction }
  }

  async solana_signAllTransactions(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (!Array.isArray(args.params.transactions)) {
      throw new Error('Invalid params')
    }

    const signedTransactions: solanaKit.Base64EncodedWireTransaction[] = []

    for (const transaction of args.params.transactions) {
      const parsedTransaction = this.#parseTransaction(transaction)
      const signedTransaction = await this.#service.signTransaction(parsedTransaction, args.account)
      signedTransactions.push(signedTransaction)
    }

    return {
      transactions: signedTransactions,
    }
  }

  async solana_signAndSendTransaction(args: TWalletConnectServiceRequestMethodParams<N>) {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const options = args.params.sendOptions ?? {}

    const parsedTransaction = this.#parseTransaction(args.params.transaction)

    const signedTransaction = await this.#service.signTransaction(parsedTransaction, args.account)

    const signature = await this.#service.solanaKitRpc
      .sendTransaction(signedTransaction, {
        maxRetries: options.maxRetries,
        preflightCommitment: options.preflightCommitment,
        minContextSlot: options.minContextSlot,
        skipPreflight: options.skipPreflight,
      })
      .send()

    return { signature }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    if (typeof args.params.transaction !== 'string') {
      throw new Error('Invalid params')
    }

    const transaction = this.#parseTransaction(args.params.transaction)

    const messageBase64 = solanaKit.getBase64Decoder().decode(transaction.messageBytes)

    const feeResponse = await this.#service.solanaKitRpc
      .getFeeForMessage(messageBase64 as any, { commitment: 'confirmed' })
      .send()

    if (!feeResponse.value) {
      throw new Error('Failed to calculate fee')
    }

    const feeBn = BSBigNumberHelper.fromDecimals(feeResponse.value.toString(), this.#service.feeToken.decimals)
    return BSBigNumberHelper.toNumber(feeBn).toString()
  }
}
