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

  readonly #service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    this.#service = service
    this.chain = `${this.namespace}:${this.#service.network.id.toString()}`
  }

  async #resolveParams(args: TWalletConnectServiceRequestMethodParams<N>) {
    const wallet = await this.#service.generateSigner(args.account)
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

    const param = args.params[0]

    if (typeof param !== 'object') {
      throw new Error('Invalid Params')
    }

    if (param.gas) {
      param.gasLimit = param.gas
      delete param.gas
    }

    if (param.type && typeof param.type !== 'number') {
      param.type = parseInt(param.type)
    }

    const gasPrice = await provider.getGasPrice()

    if (param.type === 2) {
      param.maxPriorityFeePerGas = param.maxPriorityFeePerGas ?? gasPrice
      param.maxFeePerGas = param.maxPriorityFeePerGas ?? gasPrice
    } else {
      param.gasPrice = param.gasPrice ?? gasPrice
    }

    if (!param.gasLimit) {
      const connectedWallet = wallet.connect(provider)
      try {
        param.gasLimit = await connectedWallet.estimateGas({
          ...param,
          gasLimit: BSEthereumConstants.DEFAULT_GAS_LIMIT,
        })
      } catch {
        param.gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
      }
    }

    return {
      param,
      provider,
      wallet,
    }
  }

  #convertHexToUtf8(value: string) {
    if (ethers.utils.isHexString(value)) {
      return ethers.utils.toUtf8String(value)
    }

    return value
  }

  async personal_sign(args: TWalletConnectServiceRequestMethodParams<N>) {
    const wallet = await this.#service.generateSigner(args.account)

    const message = args.params.filter((param: any) => !ethers.utils.isAddress(param))[0]
    const convertedMessage = this.#convertHexToUtf8(message)

    const signedMessage = await wallet.signMessage(convertedMessage)
    return signedMessage
  }

  async eth_sign(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.personal_sign(args)
  }

  async eth_signTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, wallet } = await this.#resolveParams(args)
    const signature = await wallet.signTransaction(param)
    return signature
  }

  async eth_signTypedData(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const wallet = await this.#service.generateSigner(args.account)

    const data = args.params.filter((param: any) => !ethers.utils.isAddress(param))[0]
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data

    const { domain, types, message } = parsedData
    // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
    delete types.EIP712Domain
    const signedData = await wallet._signTypedData(domain, types, message)
    return signedData
  }

  async eth_signTypedData_v3(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.eth_signTypedData(args)
  }

  async eth_signTypedData_v4(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    return await this.eth_signTypedData(args)
  }

  async eth_sendTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, provider, wallet } = await this.#resolveParams(args)

    const connectedWallet = wallet.connect(provider)

    const { hash } = await connectedWallet.sendTransaction(param)
    return hash
  }

  async eth_call(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { param, provider, wallet } = await this.#resolveParams(args)

    const connectedWallet = wallet.connect(provider)

    return await connectedWallet.call(param)
  }

  async eth_requestAccounts(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string[]> {
    const wallet = await this.#service.generateSigner(args.account)
    return [await wallet.getAddress()]
  }

  async eth_sendRawTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

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
    const { param, wallet, provider } = await this.#resolveParams(args)
    const connectedWallet = wallet.connect(provider)

    const gasPrice = await provider.getGasPrice()
    const estimated = await connectedWallet.estimateGas(param)

    return ethers.utils.formatEther(gasPrice.mul(estimated))
  }
}
