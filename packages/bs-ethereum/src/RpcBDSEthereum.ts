import {
  BalanceResponse,
  BlockchainDataService,
  ContractResponse,
  Network,
  RpcResponse,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { ERC20_ABI } from './assets/abis/ERC20'
import { BSEthereumNetworkId, BSEthereumHelper } from './BSEthereumHelper'

export class RpcBDSEthereum implements BlockchainDataService {
  _network: Network<BSEthereumNetworkId>
  _tokenCache: Map<string, Token> = new Map()

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5

  constructor(network: Network<BSEthereumNetworkId>) {
    this._network = network
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const provider = new ethers.providers.JsonRpcProvider(this._network.url)

    const transaction = await provider.getTransaction(hash)
    if (!transaction || !transaction.blockHash || !transaction.to) throw new Error('Transaction not found')

    const block = await provider.getBlock(transaction.blockHash)
    if (!block) throw new Error('Block not found')

    const token = BSEthereumHelper.getNativeAsset(this._network)

    return {
      block: block.number,
      time: block.timestamp,
      hash: transaction.hash,
      transfers: [
        {
          type: 'token',
          amount: ethers.utils.formatEther(transaction.value),
          contractHash: '-',
          from: transaction.from,
          to: transaction.to,
          token,
        },
      ],
      notifications: [],
    }
  }

  async getTransactionsByAddress(_params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    throw new Error("RPC doesn't support get transactions history of address")
  }

  async getContract(_hash: string): Promise<ContractResponse> {
    throw new Error("RPC doesn't support contract info")
  }

  async getTokenInfo(hash: string): Promise<Token> {
    const nativeAsset = BSEthereumHelper.getNativeAsset(this._network)

    if (BSEthereumHelper.normalizeHash(nativeAsset.hash) === BSEthereumHelper.normalizeHash(hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const provider = new ethers.providers.JsonRpcProvider(this._network.url)
    const contract = new ethers.Contract(hash, ERC20_ABI, provider)

    const decimals = await contract.decimals()
    const symbol = await contract.symbol()

    const token: Token = {
      decimals,
      symbol,
      hash,
      name: symbol,
    }

    this._tokenCache.set(hash, token)

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const provider = new ethers.providers.JsonRpcProvider(this._network.url)
    const balance = await provider.getBalance(address)

    const token = BSEthereumHelper.getNativeAsset(this._network)

    return [
      {
        amount: ethers.utils.formatEther(balance),
        token,
      },
    ]
  }

  async getBlockHeight(): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(this._network.url)
    return await provider.getBlockNumber()
  }

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []

    const urls = BSEthereumHelper.getRpcList(this._network)

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
