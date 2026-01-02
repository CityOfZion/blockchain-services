import {
  BSPromisesHelper,
  IWalletConnectService,
  TBSNetworkId,
  TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { IBSEthereum, WalletConnectServiceEthereum } from '@cityofzion/bs-ethereum'
import { toHex } from 'viem'
import axios from 'axios'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'

export class WalletConnectServiceNeoX<N extends string, A extends TBSNetworkId>
  extends WalletConnectServiceEthereum<N, A>
  implements IWalletConnectService
{
  constructor(service: IBSEthereum<N, A>) {
    super(service)

    this.supportedMethods.push('eth_getTransactionCount', 'eth_getCachedTransaction')
  }

  async eth_getTransactionCount(args: TWalletConnectServiceRequestMethodParams<N>): Promise<number> {
    const wallet = await this._service.generateSigner(args.account)
    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
    const connectedWallet = wallet.connect(provider)

    return await connectedWallet.getTransactionCount()
  }

  async eth_getCachedTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<`0x${string}`> {
    const url = this._service.network.url
    const wallet = await this._service.generateSigner(args.account)
    const provider = new ethers.providers.JsonRpcProvider(url)
    const connectedWallet = wallet.connect(provider)
    const nonce = args.params[0]
    const signature = await connectedWallet.signMessage(nonce.toString())
    const hexNonce = toHex(nonce)

    // Keep using Axios because of the wallet, provider and connectedWallet don't have the eth_getCachedTransaction method
    const cachedTransactionResponse = await axios.post(url, {
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'eth_getCachedTransaction',
      params: [hexNonce, signature],
    })

    return cachedTransactionResponse.data.result
  }

  async eth_sendTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const isAntiMevNetwork = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[this._service.network.id].some(
      url => url === this._service.network.url
    )

    if (!isAntiMevNetwork) return await super.eth_sendTransaction(args)

    const { wallet, provider, param } = await this._resolveParams(args)
    const connectedWallet = wallet.connect(provider)

    const [transactionResponse, transactionError] = await BSPromisesHelper.tryCatch(() =>
      connectedWallet.sendTransaction(param)
    )

    const transactionHash = transactionResponse?.hash || transactionError?.returnedHash

    if (!transactionHash) throw transactionError || new Error('Transaction error')

    return transactionHash
  }

  async eth_sendRawTransaction(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const { wallet, provider, param } = await this._resolveParams(args)
    const connectedWallet = wallet.connect(provider)
    const signedTransaction = await connectedWallet.signTransaction(param)

    // Keep using Axios because of the wallet, provider and connectedWallet don't have the eth_sendRawTransaction method
    const transactionResponse = await axios.post(this._service.network.url, {
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signedTransaction],
    })

    return transactionResponse.data.result
  }
}
