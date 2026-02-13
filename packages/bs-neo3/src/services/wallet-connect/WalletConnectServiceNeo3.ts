import type { IWalletConnectService, TWalletConnectServiceRequestMethodParams } from '@cityofzion/blockchain-service'
import type { IBSNeo3 } from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'

export class WalletConnectServiceNeo3<N extends string> implements IWalletConnectService<N> {
  readonly namespace: string = 'neo3'
  readonly chain: string
  readonly supportedMethods: string[] = [
    'invokeFunction',
    'testInvoke',
    'signMessage',
    'verifyMessage',
    'getWalletInfo',
    'traverseIterator',
    'getNetworkVersion',
    'encrypt',
    'decrypt',
    'decryptFromArray',
    'calculateFee',
    'signTransaction',
  ]
  readonly supportedEvents: string[] = []
  readonly calculableMethods: string[] = ['invokeFunction', 'signTransaction']
  readonly autoApproveMethods: string[] = [
    'testInvoke',
    'getWalletInfo',
    'traverseIterator',
    'getNetworkVersion',
    'calculateFee',
  ]

  readonly #service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    this.#service = service

    const networkId = BSNeo3Helper.isCustomNetwork(this.#service.network)
      ? 'private'
      : this.#service.network.id.toString()

    this.chain = `${this.namespace}:${networkId}`
  }

  [methodName: string]: any

  async #getInvoker(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(args.account)

    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback,
    })

    return invoker
  }

  async #getSigner(args: TWalletConnectServiceRequestMethodParams<N>) {
    const { neonJsAccount } = await this.#service.generateSigningCallback(args.account)

    const { NeonSigner } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const signer = new NeonSigner(neonJsAccount)

    return signer
  }

  async invokeFunction(args: TWalletConnectServiceRequestMethodParams<N>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.invokeFunction(args.params)
  }

  async testInvoke(args: TWalletConnectServiceRequestMethodParams<N>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.testInvoke(args.params)
  }

  async signMessage(args: TWalletConnectServiceRequestMethodParams<N>) {
    const signer = await this.#getSigner(args)
    return await signer.signMessage(args.params)
  }

  async verifyMessage(args: TWalletConnectServiceRequestMethodParams<N>) {
    const signer = await this.#getSigner(args)
    return await signer.verifyMessage(args.params)
  }

  async traverseIterator(args: TWalletConnectServiceRequestMethodParams<N>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.traverseIterator(args.params[0], args.params[1], args.params[2])
  }

  async decrypt(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const signer = await this.#getSigner(args)
    return await signer.decrypt(args.params[0])
  }

  async encrypt(args: TWalletConnectServiceRequestMethodParams<N>) {
    const signer = await this.#getSigner(args)
    return await signer.encrypt(args.params[0], args.params[1])
  }

  async decryptFromArray(args: TWalletConnectServiceRequestMethodParams<N>) {
    const signer = await this.#getSigner(args)
    return await signer.decryptFromArray(args.params[0])
  }

  async getNetworkVersion() {
    const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()
    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    const response = await rpcClient.getVersion()
    return {
      rpcAddress: this.#service.network.url,
      ...response,
    }
  }

  async calculateFee(args: TWalletConnectServiceRequestMethodParams<N>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.calculateFee(args.params)
  }

  async signTransaction(args: TWalletConnectServiceRequestMethodParams<N>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.signTransaction(args.params)
  }

  async getWalletInfo(args: TWalletConnectServiceRequestMethodParams<N>) {
    return {
      isLedger: args.account.isHardware || false,
    }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { total } = await this.calculateFee(args)
    return total.toString()
  }
}
