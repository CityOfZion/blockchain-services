import {
  type TBalanceResponse,
  type IBlockchainDataService,
  type TBSNetworkId,
  type TBSToken,
  type TContractResponse,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionDefault,
  BSBigUnitAmount,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import type { IBSEthereum } from '../../types'

export class RpcBDSEthereum<
  N extends string,
  A extends TBSNetworkId,
  S extends IBSEthereum<N, A> = IBSEthereum<N, A>,
> implements IBlockchainDataService<N> {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5 // 5 minutes
  readonly _tokenCache: Map<string, TBSToken> = new Map()
  readonly _service: S

  #providerInstance?: ethers.providers.JsonRpcProvider

  constructor(service: S) {
    this._service = service
  }

  get #provider() {
    if (!this.#providerInstance) {
      this.#providerInstance = new ethers.providers.JsonRpcProvider(this._service.network.url)
    }
    return this.#providerInstance
  }

  async getTransaction(hash: string): Promise<TTransactionDefault<N>> {
    const transaction = await this.#provider.getTransaction(hash)
    if (!transaction || !transaction.to) throw new Error('Transaction not found')

    const receipt = await this.#provider.getTransactionReceipt(hash)
    if (!receipt) throw new Error('Receipt not found')

    const effectiveGasPrice = receipt.effectiveGasPrice ?? transaction.gasPrice
    const fee = effectiveGasPrice.mul(receipt.gasUsed)

    const token = BSEthereumHelper.getNativeAsset(this._service.network)

    const fromUrl = this._service.explorerService.buildAddressUrl(transaction.from)
    const toUrl = this._service.explorerService.buildAddressUrl(transaction.to)

    const timestamp = transaction.timestamp ?? 0

    return {
      blockchain: this._service.name,
      isPending: false,
      txId: hash,
      txIdUrl: this._service.explorerService.buildTransactionUrl(hash),
      block: receipt.blockNumber,
      date: new Date(timestamp).toJSON(),
      networkFeeAmount: new BSBigUnitAmount(fee.toString(), token.decimals).toHuman().toFormatted(),
      view: 'default',
      events: [
        {
          eventType: 'token',
          amount: new BSBigUnitAmount(transaction.value.toString(), token.decimals).toHuman().toFormatted(),
          methodName: 'transfer',
          from: transaction.from,
          fromUrl,
          to: transaction.to,
          toUrl,
          tokenUrl: this._service.explorerService.buildContractUrl(token.hash),
          token,
        },
      ],
    }
  }

  async getTransactionsByAddress(
    _params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N, TTransactionDefault<N>>> {
    throw new Error('Method not supported.')
  }

  async getContract(_hash: string): Promise<TContractResponse> {
    throw new Error('Method not supported.')
  }

  async getTokenInfo(hash: string): Promise<TBSToken> {
    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    if (this._service.tokenService.predicateByHash(nativeAsset, hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const contract = new ethers.Contract(hash, ERC20_ABI, this.#provider)

    const decimals = await contract.decimals()
    const symbol = await contract.symbol()

    const token = this._service.tokenService.normalizeToken({
      decimals,
      symbol,
      hash,
      name: symbol,
    })

    this._tokenCache.set(hash, token)

    return token
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const balance = await this.#provider.getBalance(address)

    const token = BSEthereumHelper.getNativeAsset(this._service.network)

    return [
      {
        amount: new BSBigUnitAmount(balance.toString(), token.decimals).toHuman().toFormatted(),
        token,
      },
    ]
  }

  async getBlockHeight(): Promise<number> {
    return await this.#provider.getBlockNumber()
  }
}
