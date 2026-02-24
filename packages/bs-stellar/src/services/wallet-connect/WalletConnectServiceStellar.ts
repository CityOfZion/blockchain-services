import {
  BSBigNumberHelper,
  BSError,
  IWalletConnectService,
  TWalletConnectServiceRequestMethodParams,
  BSUtilsHelper,
} from '@cityofzion/blockchain-service'
import type { IBSStellar } from '../../types'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'

export class WalletConnectServiceStellar<N extends string> implements IWalletConnectService<N> {
  readonly namespace: string = 'stellar'
  readonly chain: string
  readonly supportedMethods: string[] = [
    'stellar_signXDR',
    'stellar_signAndSubmitXDR',
    'stellar_signMessage',
    'stellar_signAuthEntry',
    'stellar_getNetwork',
  ]
  readonly supportedEvents: string[] = []
  readonly calculableMethods: string[] = ['stellar_signAndSubmitXDR']
  readonly autoApproveMethods: string[] = ['stellar_getNetwork']

  readonly #service: IBSStellar<N>

  constructor(service: IBSStellar<N>) {
    this.#service = service

    this.chain = `${this.namespace}:${this.#service.network.id}`
  }

  [methodName: string]: any

  async stellar_signXDR(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { xdr } = args?.params ?? {}

    if (typeof xdr !== 'string') {
      throw new BSError('Invalid params: xdr must be a string', 'INVALID_PARAMS')
    }

    const transaction = new stellarSDK.Transaction(
      xdr,
      BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
    )

    const signedTransaction = await this.#service.signTransaction(transaction, args.account)

    const signedXDR = signedTransaction.toXDR()

    return { signedXDR, signerAddress: args.account.address }
  }

  async stellar_signAndSubmitXDR(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { xdr } = args?.params ?? {}

    if (typeof xdr !== 'string') {
      throw new BSError('Invalid params: xdr must be a string', 'INVALID_PARAMS')
    }

    const transaction = new stellarSDK.Transaction(
      xdr,
      BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
    )

    const signedTransaction = await this.#service.signTransaction(transaction, args.account)

    const response = await this.#service.sorobanServer.sendTransaction(signedTransaction)

    return { status: response.status, hash: response.hash }
  }

  async stellar_signMessage(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { message } = args?.params ?? {}

    if (typeof message !== 'string') {
      throw new BSError('Invalid params: message must be a string', 'INVALID_PARAMS')
    }

    const keypair = stellarSDK.Keypair.fromSecret(args.account.key)

    const prefix = `Stellar Signed Message:\n${message}`

    const messageBytes = Buffer.concat([
      Buffer.from(prefix, 'utf8'),
      Buffer.from(message, BSUtilsHelper.isBase64(message) ? 'base64' : 'utf8'),
    ])
    const messageHash = stellarSDK.hash(messageBytes)

    const signature = keypair.sign(messageHash).toString('base64')

    return {
      signedMessage: signature,
      signerAddress: keypair.publicKey(),
    }
  }

  async stellar_signAuthEntry(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { xdr } = args?.params ?? {}

    if (typeof xdr !== 'string') {
      throw new BSError('Invalid params: xdr must be an string', 'INVALID_PARAMS')
    }

    const keypair = stellarSDK.Keypair.fromSecret(args.account.key)

    const entryBytes = Buffer.from(xdr, 'base64')
    const entryHash = stellarSDK.hash(entryBytes)

    const signature = keypair.sign(entryHash).toString('base64')

    return {
      signedAuthEntry: signature,
      signerAddress: keypair.publicKey(),
    }
  }

  async stellar_getNetwork(_args: TWalletConnectServiceRequestMethodParams<N>) {
    return {
      network: this.#service.network.id === 'pubnet' ? 'PUBLIC' : 'TESTNET',
      networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id],
    }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { xdr } = args?.params ?? {}

    if (typeof xdr !== 'string') {
      throw new BSError('Invalid params: xdr must be a string', 'INVALID_PARAMS')
    }

    const transaction = new stellarSDK.Transaction(
      xdr,
      BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id]
    )

    const feeBn = await this.#service.getFeeEstimate(transaction.operations.length)

    return BSBigNumberHelper.toNumber(feeBn, this.#service.feeToken.decimals)
  }
}
