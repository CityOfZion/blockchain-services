import {
  BSBigNumberHelper,
  BSError,
  IWalletConnectService,
  TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import type { IBSStellar } from '../../types'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'

export class WalletConnectServiceStellar<N extends string> implements IWalletConnectService<N> {
  readonly namespace: string = 'stellar'
  readonly chain: string
  readonly supportedMethods: string[] = ['stellar_signXDR', 'stellar_signAndSubmitXDR']
  readonly supportedEvents: string[] = []
  readonly calculableMethods: string[] = ['stellar_signAndSubmitXDR']
  readonly autoApproveMethods: string[] = []

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

    return { signedXDR }
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

    return { status: response.status }
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
