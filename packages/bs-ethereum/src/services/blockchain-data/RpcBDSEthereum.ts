import {
  TBalanceResponse,
  ContractResponse,
  TExportTransactionsByAddressParams,
  TFullTransactionsByAddressParams,
  TFullTransactionsByAddressResponse,
  IBlockchainDataService,
  TRpcResponse,
  TNetworkId,
  TBSToken,
  TTransactionResponse,
  TTransactionsByAddressParams,
  TTransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import { IBSEthereum } from '../../types'

export class RpcBDSEthereum<N extends string, A extends TNetworkId, S extends IBSEthereum<N, A> = IBSEthereum<N, A>>
  implements IBlockchainDataService
{
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5 // 5 minutes
  readonly _tokenCache: Map<string, TBSToken> = new Map()
  readonly _service: S

  constructor(service: S) {
    this._service = service
  }

  async getTransaction(hash: string): Promise<TTransactionResponse> {
    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)

    const transaction = await provider.getTransaction(hash)
    if (!transaction || !transaction.blockHash || !transaction.to) throw new Error('Transaction not found')

    const block = await provider.getBlock(transaction.blockHash)
    if (!block) throw new Error('Block not found')

    const token = BSEthereumHelper.getNativeAsset(this._service.network)

    return {
      block: block.number,
      time: block.timestamp,
      hash: transaction.hash,
      transfers: [
        {
          type: 'token',
          amount: ethers.utils.formatEther(transaction.value),
          contractHash: token.hash,
          from: transaction.from,
          to: transaction.to,
          token,
        },
      ],
      notifications: [],
      type: 'default',
    }
  }

  async getTransactionsByAddress(_params: TTransactionsByAddressParams): Promise<TTransactionsByAddressResponse> {
    throw new Error('Method not supported.')
  }

  async getFullTransactionsByAddress(
    _params: TFullTransactionsByAddressParams
  ): Promise<TFullTransactionsByAddressResponse> {
    throw new Error('Method not supported.')
  }

  async exportFullTransactionsByAddress(_params: TExportTransactionsByAddressParams): Promise<string> {
    throw new Error('Method not supported.')
  }

  async getContract(_hash: string): Promise<ContractResponse> {
    throw new Error('Method not supported.')
  }

  async getTokenInfo(hash: string): Promise<TBSToken> {
    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    if (this._service.tokenService.predicateByHash(nativeAsset, hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
    const contract = new ethers.Contract(hash, ERC20_ABI, provider)

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
    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
    const balance = await provider.getBalance(address)

    const token = BSEthereumHelper.getNativeAsset(this._service.network)

    return [
      {
        amount: ethers.utils.formatEther(balance),
        token,
      },
    ]
  }

  async getBlockHeight(): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
    return await provider.getBlockNumber()
  }

  async getRpcList(): Promise<TRpcResponse[]> {
    const list: TRpcResponse[] = []

    const urls = BSEthereumHelper.getRpcList(this._service.network)

    const promises = urls.map(url => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async resolve => {
        const timeout = setTimeout(() => {
          resolve()
        }, 5000)

        try {
          const provider = new ethers.providers.JsonRpcProvider(url)

          const timeStart = Date.now()
          const height = await provider.getBlockNumber()
          const latency = Date.now() - timeStart

          list.push({
            url,
            height,
            latency,
          })
        } catch {
          /* empty */
        } finally {
          resolve()
          clearTimeout(timeout)
        }
      })
    })

    await Promise.allSettled(promises)

    return list
  }
}
