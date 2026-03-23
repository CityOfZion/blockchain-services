import type { IWalletConnectService, TWalletConnectServiceRequestMethodParams } from '@cityofzion/blockchain-service'
import type { IBSNeo3, TBSNeo3Name } from '../../types'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'

export class WalletConnectServiceNeo3 implements IWalletConnectService<TBSNeo3Name> {
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

  readonly #service: IBSNeo3

  constructor(service: IBSNeo3) {
    this.#service = service

    const networkId = service.network.type === 'custom' ? 'private' : this.#service.network.id.toString()

    this.chain = `${this.namespace}:${networkId}`
  }

  [methodName: string]: any

  async #getInvoker(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(args.account)

    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback,
    })

    return invoker
  }

  async #getSigner(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const { neonJsAccount } = await this.#service.generateSigningCallback(args.account)

    const { NeonSigner } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const signer = new NeonSigner(neonJsAccount)

    return signer
  }

  async invokeFunction(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.invokeFunction(args.params)
  }

  async testInvoke(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.testInvoke(args.params)
  }

  async signMessage(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const signer = await this.#getSigner(args)
    return await signer.signMessage(args.params)
  }

  async verifyMessage(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const signer = await this.#getSigner(args)
    return await signer.verifyMessage(args.params)
  }

  async traverseIterator(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.traverseIterator(args.params[0], args.params[1], args.params[2])
  }

  async decrypt(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>): Promise<string> {
    const signer = await this.#getSigner(args)
    return await signer.decrypt(args.params[0])
  }

  async encrypt(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const signer = await this.#getSigner(args)

    let publicKeys = args.params[1]
    if (!publicKeys || publicKeys.length === 0) {
      publicKeys = [signer.account!.getPublicKey()]
    }

    return await signer.encrypt(args.params[0], publicKeys)
  }

  async decryptFromArray(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
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

  async calculateFee(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.calculateFee(args.params)
  }

  async signTransaction(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    const invoker = await this.#getInvoker(args)
    return await invoker.signTransaction(args.params)
  }

  async getWalletInfo(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>) {
    return {
      isLedger: args.account.isHardware || false,
    }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<TBSNeo3Name>): Promise<string> {
    const { total } = await this.calculateFee(args)
    return total.toString()
  }
}
