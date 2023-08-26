import {
  BalanceResponse,
  BlockchainDataService,
  ContractResponse,
  Network,
  NetworkType,
  Token,
  TransactionHistoryResponse,
  TransactionResponse,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { TOKENS } from './constants'

export class RpcBDSEthereum implements BlockchainDataService {
  private readonly network: Network

  constructor(network: Network) {
    this.network = network
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const provider = new ethers.JsonRpcProvider(this.network.url)

    const transaction = await provider.getTransaction(hash)
    if (!transaction || !transaction.blockHash || !transaction.to) throw new Error('Transaction not found')

    const block = await provider.getBlock(transaction.blockHash)
    if (!block) throw new Error('Block not found')

    const tokens = TOKENS[this.network.type]
    const token = tokens.find(token => token.symbol === 'ETH')!

    return {
      block: block.number,
      time: block.timestamp,
      hash: transaction.hash,
      transfers: [
        {
          type: 'token',
          amount: Number(ethers.formatEther(transaction.value)),
          contractHash: '-',
          from: transaction.from,
          to: transaction.to,
          token,
        },
      ],
      notifications: [],
    }
  }

  async getTransactionsByAddress(address: string, page: number): Promise<TransactionHistoryResponse> {
    throw new Error("RPC doesn't support get transactions history of address")
  }

  async getContract(): Promise<ContractResponse> {
    throw new Error("RPC doesn't support contract info")
  }

  async getTokenInfo(hash: string): Promise<Token> {
    const tokens = TOKENS[this.network.type]
    const token = tokens.find(token => token.hash === hash)
    if (!token) throw new Error('Token not found')

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const provider = new ethers.JsonRpcProvider(this.network.url)
    const balance = await provider.getBalance(address)

    const tokens = TOKENS[this.network.type]
    const token = tokens.find(token => token.symbol === 'ETH')!

    return [
      {
        amount: Number(ethers.formatEther(balance)),
        token,
      },
    ]
  }
}
