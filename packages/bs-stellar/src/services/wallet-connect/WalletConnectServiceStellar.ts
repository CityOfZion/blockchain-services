import {
  IWalletConnectService,
  TWalletConnectServiceRequestMethodParams,
  BSUtilsHelper,
  type TWalletConnectServiceMethodHandler,
  type TWalletConnectServiceHandlers,
} from '@cityofzion/blockchain-service'
import type { IBSStellar, TBSStellarName, TWalletConnectServiceStellarMethod } from '../../types'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'
import { z } from 'zod'

const signXDRParamsSchema = z.object({ xdr: z.string() })

const signMessageParamsSchema = z.object({ message: z.string() })

const signAuthEntryParamsSchema = z.object({ xdr: z.string() })

export class WalletConnectServiceStellar implements IWalletConnectService<
  TBSStellarName,
  TWalletConnectServiceStellarMethod
> {
  readonly namespace: string = 'stellar'
  readonly chain: string

  // prettier-ignore
  readonly supportedMethods: TWalletConnectServiceStellarMethod[] = [
    'stellar_signXDR', 'stellar_signAndSubmitXDR', 'stellar_signMessage', 'stellar_signAuthEntry',
    'stellar_getNetwork',
  ]
  readonly supportedEvents: string[] = []
  readonly calculableMethods: TWalletConnectServiceStellarMethod[] = ['stellar_signAndSubmitXDR']
  readonly autoApproveMethods: TWalletConnectServiceStellarMethod[] = ['stellar_getNetwork']

  readonly #service: IBSStellar

  handlers: TWalletConnectServiceHandlers<
    TBSStellarName,
    {
      stellar_signXDR: z.infer<typeof signXDRParamsSchema>
      stellar_signAndSubmitXDR: z.infer<typeof signXDRParamsSchema>
      stellar_signMessage: z.infer<typeof signMessageParamsSchema>
      stellar_signAuthEntry: z.infer<typeof signAuthEntryParamsSchema>
      stellar_getNetwork: unknown
    }
  >

  constructor(service: IBSStellar) {
    this.#service = service

    this.chain = `${this.namespace}:${this.#service.network.id}`

    this.handlers = {
      stellar_signXDR: this.#signXDRHandler,
      stellar_signAndSubmitXDR: this.#signAndSubmitHandler,
      stellar_signMessage: this.#signMessageHandler,
      stellar_signAuthEntry: this.#signAuthEntryHandler,
      stellar_getNetwork: this.#getNetworkHandler,
    }
  }

  #signXDRHandler: TWalletConnectServiceMethodHandler<TBSStellarName, z.infer<typeof signXDRParamsSchema>> = {
    validate: async params => await signXDRParamsSchema.parseAsync(params),
    process: async args => {
      const transaction = new stellarSDK.Transaction(
        args.params.xdr,
        BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
      )

      const signedTransaction = await this.#service._signTransaction(transaction, args.account)

      const signedXDR = signedTransaction.toXDR()

      return { signedXDR, signerAddress: args.account.address }
    },
  }

  #signAndSubmitHandler: TWalletConnectServiceMethodHandler<TBSStellarName, z.infer<typeof signXDRParamsSchema>> = {
    validate: async params => await signXDRParamsSchema.parseAsync(params),
    process: async args => {
      const transaction = new stellarSDK.Transaction(
        args.params.xdr,
        BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
      )

      const signedTransaction = await this.#service._signTransaction(transaction, args.account)

      const response = await this.#service._sorobanServer.sendTransaction(signedTransaction)

      return { status: response.status, hash: response.hash }
    },
  }

  #signMessageHandler: TWalletConnectServiceMethodHandler<TBSStellarName, z.infer<typeof signMessageParamsSchema>> = {
    validate: async params => await signMessageParamsSchema.parseAsync(params),
    process: async args => {
      const keypair = stellarSDK.Keypair.fromSecret(args.account.key)

      const prefix = `Stellar Signed Message:\n${args.params.message}`

      const messageBytes = Buffer.concat([
        Buffer.from(prefix, 'utf8'),
        Buffer.from(args.params.message, BSUtilsHelper.isBase64(args.params.message) ? 'base64' : 'utf8'),
      ])
      const messageHash = stellarSDK.hash(messageBytes)

      const signature = keypair.sign(messageHash).toString('base64')

      return {
        signedMessage: signature,
        signerAddress: keypair.publicKey(),
      }
    },
  }

  #signAuthEntryHandler: TWalletConnectServiceMethodHandler<TBSStellarName, z.infer<typeof signAuthEntryParamsSchema>> =
    {
      validate: async params => await signAuthEntryParamsSchema.parseAsync(params),
      process: async args => {
        const keypair = stellarSDK.Keypair.fromSecret(args.account.key)

        const entryBytes = Buffer.from(args.params.xdr, 'base64')
        const entryHash = stellarSDK.hash(entryBytes)

        const signature = keypair.sign(entryHash).toString('base64')

        return {
          signedAuthEntry: signature,
          signerAddress: keypair.publicKey(),
        }
      },
    }

  #getNetworkHandler: TWalletConnectServiceMethodHandler<TBSStellarName> = {
    validate: async () => {},
    process: async () => {
      return {
        network: this.#service.network.id === 'pubnet' ? 'PUBLIC' : 'TESTNET',
        networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id],
      }
    },
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<TBSStellarName>): Promise<string> {
    const params = await this.#signAndSubmitHandler.validate(args.params)

    const transaction = new stellarSDK.Transaction(
      params.xdr,
      BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
    )

    const feeBn = await this.#service._getFeeEstimate(transaction.operations.length)

    return feeBn.toHuman().toFormatted()
  }
}
