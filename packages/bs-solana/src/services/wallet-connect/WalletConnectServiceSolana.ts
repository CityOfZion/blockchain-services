import {
  type IWalletConnectService,
  type TWalletConnectServiceHandlers,
  type TWalletConnectServiceMethodHandler,
  type TWalletConnectServiceRequestMethodParams,
  BSBigUnitAmount,
  BSError,
} from '@cityofzion/blockchain-service'
import type { IBSSolana, TBSSolanaName, TBSSolanaNetworkId, TWalletConnectServiceSolanaMethod } from '../../types'
import * as solanaKit from '@solana/kit'
import z from 'zod'

const signMessageParamsSchema = z.object({ message: z.string(), pubkey: z.string() })

const signTransactionParamsSchema = z.object({ transaction: z.string() })

const signAndSendTransactionParamsSchema = z.object({ transactions: z.array(z.string()) })

const signAndSendTransactionOptionsSchema = z.object({
  transaction: z.string(),
  sendOptions: z
    .object({
      maxRetries: z.bigint().optional(),
      preflightCommitment: z.union([z.literal('confirmed'), z.literal('finalized'), z.literal('processed')]).optional(),
      minContextSlot: z.bigint().optional(),
      skipPreflight: z.boolean().optional(),
    })
    .optional(),
})

export class WalletConnectServiceSolana implements IWalletConnectService<
  TBSSolanaName,
  TWalletConnectServiceSolanaMethod
> {
  static networkIdByNetworkType: Record<TBSSolanaNetworkId, string> = {
    'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  }

  readonly namespace = 'solana'
  readonly chain: string

  // prettier-ignore
  readonly supportedMethods: TWalletConnectServiceSolanaMethod[] = [
    'solana_getAccounts', 'solana_requestAccounts', 'solana_signMessage', 'solana_signTransaction',
    'solana_signAllTransactions', 'solana_signAndSendTransaction',
  ]
  readonly supportedEvents: string[] = []
  readonly calculableMethods: TWalletConnectServiceSolanaMethod[] = ['solana_signAndSendTransaction']
  readonly autoApproveMethods: TWalletConnectServiceSolanaMethod[] = ['solana_getAccounts', 'solana_requestAccounts']

  readonly #service: IBSSolana

  handlers: TWalletConnectServiceHandlers<
    TBSSolanaName,
    {
      solana_getAccounts: unknown
      solana_requestAccounts: unknown
      solana_signMessage: z.infer<typeof signMessageParamsSchema>
      solana_signTransaction: z.infer<typeof signTransactionParamsSchema>
      solana_signAllTransactions: z.infer<typeof signAndSendTransactionParamsSchema>
      solana_signAndSendTransaction: z.infer<typeof signAndSendTransactionOptionsSchema>
    }
  >

  constructor(service: IBSSolana) {
    this.#service = service

    const networkId = WalletConnectServiceSolana.networkIdByNetworkType[this.#service.network.id]

    this.chain = `${this.namespace}:${networkId}`

    this.handlers = {
      solana_getAccounts: this.#getAccountsHandler,
      solana_requestAccounts: this.#getAccountsHandler,
      solana_signMessage: this.#signMessageHandler,
      solana_signTransaction: this.#signTransactionHandler,
      solana_signAllTransactions: this.#signAllTransactionsHandler,
      solana_signAndSendTransaction: this.#signAndSendTransactionHandler,
    }
  }

  #getAccountsHandler: TWalletConnectServiceMethodHandler<TBSSolanaName> = {
    validate: async () => {},
    process: async args => {
      return [{ pubkey: args.account.address }]
    },
  }

  #signMessageHandler: TWalletConnectServiceMethodHandler<TBSSolanaName, z.infer<typeof signMessageParamsSchema>> = {
    validate: async params => await signMessageParamsSchema.parseAsync(params),
    process: async args => {
      if (args.params.pubkey !== args.account.address) {
        throw new BSError('Public key does not match account address', 'PUBKEY_MISMATCH')
      }

      const messageBytes = solanaKit.getBase58Codec().encode(args.params.message)
      const keypair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(args.account.key))
      const signatureBuffer = await crypto.subtle.sign('Ed25519', keypair.privateKey, new Uint8Array(messageBytes))
      const signature = solanaKit.getBase58Codec().decode(new Uint8Array(signatureBuffer))
      return { signature }
    },
  }

  #signTransactionHandler: TWalletConnectServiceMethodHandler<
    TBSSolanaName,
    z.infer<typeof signTransactionParamsSchema>
  > = {
    validate: async params => await signTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const parsedTransaction = this.#parseTransaction(args.params.transaction)
      const signedTransaction = await this.#service._signTransaction(parsedTransaction, args.account)

      const signedTransactionBytes = solanaKit.getBase64Encoder().encode(signedTransaction)
      const decodedSignedTransaction = solanaKit.getTransactionCodec().decode(signedTransactionBytes)
      const [signatureBytes] = Object.values(decodedSignedTransaction.signatures)
      const signature = solanaKit.getBase58Codec().decode(new Uint8Array(signatureBytes!))

      return { signature }
    },
  }

  #signAllTransactionsHandler: TWalletConnectServiceMethodHandler<
    TBSSolanaName,
    z.infer<typeof signAndSendTransactionParamsSchema>
  > = {
    validate: async params => await signAndSendTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const signedTransactions: solanaKit.Base64EncodedWireTransaction[] = []
      for (const transaction of args.params.transactions) {
        const parsedTransaction = this.#parseTransaction(transaction)
        const signedTransaction = await this.#service._signTransaction(parsedTransaction, args.account)
        signedTransactions.push(signedTransaction)
      }

      return {
        transactions: signedTransactions,
      }
    },
  }

  #signAndSendTransactionHandler: TWalletConnectServiceMethodHandler<
    TBSSolanaName,
    z.infer<typeof signAndSendTransactionOptionsSchema>
  > = {
    validate: async params => await signAndSendTransactionOptionsSchema.parseAsync(params),
    process: async args => {
      const options = args.params.sendOptions ?? {}

      const parsedTransaction = this.#parseTransaction(args.params.transaction)

      const signedTransaction = await this.#service._signTransaction(parsedTransaction, args.account)

      const signature = await this.#service._solanaKitRpc
        .sendTransaction(signedTransaction, {
          maxRetries: options.maxRetries,
          preflightCommitment: options.preflightCommitment,
          minContextSlot: options.minContextSlot,
          skipPreflight: options.skipPreflight,
        })
        .send()

      return { signature }
    },
  }

  #parseTransaction(encodedTransaction: string) {
    const transactionBytes = solanaKit.getBase64Encoder().encode(encodedTransaction)
    const transaction = solanaKit.getTransactionCodec().decode(transactionBytes)

    return transaction
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<TBSSolanaName>): Promise<string> {
    const params = await this.#signAndSendTransactionHandler.validate(args.params).catch(error => {
      throw new BSError('Params validation failed: ' + error.message, 'INVALID_PARAMS')
    })

    const transaction = this.#parseTransaction(params.transaction)

    const messageBase64 = solanaKit.getBase64Decoder().decode(transaction.messageBytes)

    const feeResponse = await this.#service._solanaKitRpc
      .getFeeForMessage(messageBase64 as any, { commitment: 'confirmed' })
      .send()

    if (!feeResponse.value) {
      throw new Error('Failed to calculate fee')
    }

    return new BSBigUnitAmount(feeResponse.value.toString(), this.#service.feeToken.decimals).toHuman().toFormatted()
  }
}
