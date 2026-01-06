import {
  IWalletConnectService,
  TBSNetworkId,
  TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import { IBSEthereum } from '../../types'
import { ethers } from 'ethers'
import { BSEthereumConstants } from '../../constants/BSEthereumConstants'

export class WalletConnectServiceEthereum<N extends string, A extends TBSNetworkId> implements IWalletConnectService {
  readonly namespace: string = 'eip155'
  readonly chain: string
  readonly supportedMethods: string[] = [
    'personal_sign',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'eth_sendTransaction',
    'eth_call',
    'eth_requestAccounts',
    'eth_sendRawTransaction',
    'eth_addEthereumChain',
    'eth_switchEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_addEthereumChain',
  ]
  readonly supportedEvents: string[] = ['chainChanged', 'accountsChanged', 'disconnect', 'connect']
  readonly calculableMethods: string[] = ['eth_sendTransaction', 'eth_call', 'eth_sendRawTransaction']
  readonly autoApproveMethods: string[] = [
    'eth_requestAccounts',
    'eth_addEthereumChain',
    'eth_switchEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_addEthereumChain',
  ]

  protected readonly _service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    this._service = service
    this.chain = `${this.namespace}:${this._service.network.id.toString()}`
  }

  protected async _resolveParams(args: TWalletConnectServiceRequestMethodParams<N>) {
    const param = args.params[0]

    if (typeof param !== 'object') {
      throw new Error('Invalid params')
    }

    if (!param.chainId) {
      const chainId = parseInt(this._service.network.id)

      if (!isNaN(chainId)) param.chainId = chainId
    }

    if (param.gas) {
      param.gasLimit = param.gas

      delete param.gas
    }

    if (param.type && typeof param.type !== 'number') {
      const typeAsNumber = parseInt(param.type)

      if (!isNaN(typeAsNumber)) param.type = typeAsNumber
    }

    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
    const gasPrice = await provider.getGasPrice()

    if (param.type === 2) {
      param.maxPriorityFeePerGas = param.maxPriorityFeePerGas ?? gasPrice
      param.maxFeePerGas = param.maxPriorityFeePerGas ?? gasPrice
    } else {
      param.gasPrice = param.gasPrice ?? gasPrice
    }

    const wallet = await this._service.generateSigner(args.account)
    const connectedWallet = wallet.connect(provider)

    if (!param.gasLimit) {
      try {
        param.gasLimit = await connectedWallet.estimateGas({ ...param, gasPrice: undefined })
      } catch {
        param.gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
      }
    }

    if (!param.nonce) {
      param.nonce = await connectedWallet.getTransactionCount()
    }

    return {
      wallet,
      provider,
      param,
    }
  }

  #convertHexToUtf8(value: string) {
    if (ethers.utils.isHexString(value)) {
      return ethers.utils.toUtf8String(value)
    }

    return value
  }

  async personal_sign(args: TWalletConnectServiceRequestMethodParams<N>) {
    const wallet = await this._service.generateSigner(args.account)

    const message = args.params.filter((param: any) => !ethers.utils.isAddress(param))[0]
    const convertedMessage = this.#convertHexToUtf8(message)

    return await wallet.signMessage(convertedMessage)
  }

  async eth_sign(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.personal_sign(args)
  }

  async eth_signTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, wallet } = await this._resolveParams(args)

    return await wallet.signTransaction(param)
  }

  async eth_signTypedData(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const wallet = await this._service.generateSigner(args.account)

    const data = args.params.filter((param: any) => !ethers.utils.isAddress(param))[0]
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data

    const { domain, types, message } = parsedData
    // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
    delete types.EIP712Domain

    return await wallet._signTypedData(domain, types, message)
  }

  async eth_signTypedData_v3(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.eth_signTypedData(args)
  }

  async eth_signTypedData_v4(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.eth_signTypedData(args)
  }

  async eth_sendTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, provider, wallet } = await this._resolveParams(args)

    const connectedWallet = wallet.connect(provider)

    const { hash } = await connectedWallet.sendTransaction(param)
    return hash
  }

  async eth_call(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, provider, wallet } = await this._resolveParams(args)

    const connectedWallet = wallet.connect(provider)

    return await connectedWallet.call(param)
  }

  async eth_requestAccounts(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string[]> {
    const wallet = await this._service.generateSigner(args.account)
    return [await wallet.getAddress()]
  }

  async eth_sendRawTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)

    const { hash } = await provider.sendTransaction(args.params[0])

    return hash
  }

  async wallet_switchEthereumChain(): Promise<string> {
    return 'null'
  }

  async eth_addEthereumChain(): Promise<string> {
    return 'null'
  }

  async eth_switchEthereumChain(): Promise<string> {
    return 'null'
  }

  async wallet_getPermissions(): Promise<any[]> {
    return []
  }

  async wallet_requestPermissions(): Promise<any[]> {
    return []
  }

  async wallet_addEthereumChain(): Promise<string> {
    return 'null'
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, wallet, provider } = await this._resolveParams(args)
    const connectedWallet = wallet.connect(provider)
    const gasPrice = await connectedWallet.getGasPrice()
    const estimated = await connectedWallet.estimateGas({ ...param, gasLimit: undefined, gasPrice: undefined })

    return ethers.utils.formatEther(gasPrice.mul(estimated))
  }
}
