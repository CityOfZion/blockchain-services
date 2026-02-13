import {
  TBalanceResponse,
  IBlockchainDataService,
  TBSNetworkId,
  TBSToken,
  type TContractResponse,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
  BSBigNumberHelper,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import { IBSEthereum } from '../../types'

export class RpcBDSEthereum<N extends string, A extends TBSNetworkId, S extends IBSEthereum<N, A> = IBSEthereum<N, A>>
  implements IBlockchainDataService<N>
{
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

  async getTransaction(hash: string): Promise<TTransaction<N>> {
    const transaction = await this.#provider.getTransaction(hash)
    if (!transaction || !transaction.to) throw new Error('Transaction not found')

    const receipt = await this.#provider.getTransactionReceipt(hash)
    if (!receipt) throw new Error('Receipt not found')

    const effectiveGasPrice = receipt.effectiveGasPrice ?? transaction.gasPrice
    const fee = effectiveGasPrice.mul(receipt.gasUsed)

    const token = BSEthereumHelper.getNativeAsset(this._service.network)

    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()

    const fromUrl = addressTemplateUrl?.replace('{address}', transaction.from)
    const toUrl = addressTemplateUrl?.replace('{address}', transaction.to)
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', token.hash)
    const txIdUrl = txTemplateUrl?.replace('{txId}', hash)

    const timestamp = transaction.timestamp ?? 0

    return {
      txId: hash,
      txIdUrl,
      block: receipt.blockNumber,
      date: new Date(timestamp).toISOString(),
      invocationCount: 0,
      notificationCount: 0,
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(fee.toString(), this._service.feeToken.decimals),
        {
          decimals: this._service.feeToken.decimals,
        }
      ),
      events: [
        {
          eventType: 'token',
          amount: BSBigNumberHelper.format(
            BSBigNumberHelper.fromDecimals(transaction.value.toString(), token.decimals),
            {
              decimals: token.decimals,
            }
          ),
          methodName: 'transfer',
          from: transaction.from,
          fromUrl,
          to: transaction.to,
          toUrl,
          contractHash: token.hash,
          contractHashUrl,
          token: token ?? undefined,
          tokenType: 'native',
        },
      ],
      type: 'default',
    }
  }

  async getTransactionsByAddress(
    _params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
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
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(balance.toString(), token.decimals), {
          decimals: token.decimals,
        }),
        token,
      },
    ]
  }

  async getBlockHeight(): Promise<number> {
    return await this.#provider.getBlockNumber()
  }
}
