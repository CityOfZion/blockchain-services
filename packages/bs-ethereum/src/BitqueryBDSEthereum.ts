import {
  BalanceResponse,
  BlockchainDataService,
  ContractResponse,
  NetworkType,
  Token,
  TransactionHistoryResponse,
  TransactionResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import { Client, cacheExchange, fetchExchange, gql } from '@urql/core'
import fetch from 'node-fetch'
import { BITQUERY_API_KEY, BITQUERY_NETWORK_BY_NETWORK_TYPE, BITQUERY_URL, TOKENS } from './constants'
import {
  BitqueryTransaction,
  bitqueryGetBalanceQuery,
  bitqueryGetTokenInfoQuery,
  bitqueryGetTransactionQuery,
  bitqueryGetTransactionsByAddressQuery,
} from './graphql'

export class BitqueryBDSEthereum implements BlockchainDataService {
  private readonly client: Client
  private readonly networkType: Exclude<NetworkType, 'custom'>

  constructor(networkType: NetworkType) {
    if (networkType === 'custom') throw new Error('Custom network not supported')
    this.networkType = networkType

    this.client = new Client({
      url: BITQUERY_URL,
      exchanges: [cacheExchange, fetchExchange],
      fetch,
      fetchOptions: {
        headers: {
          'X-API-KEY': BITQUERY_API_KEY,
        },
      },
    })
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const result = await this.client
      .query(bitqueryGetTransactionQuery, {
        hash,
        network: BITQUERY_NETWORK_BY_NETWORK_TYPE[this.networkType],
      })
      .toPromise()
    if (result.error) throw new Error(result.error.message)
    if (!result.data || !result.data.ethereum.transfers.length) throw new Error('Transaction not found')

    const transfers = result.data.ethereum.transfers.map(this.parseTransactionTransfer)

    const {
      block: {
        height,
        timestamp: { unixtime },
      },
      transaction: { gasValue, hash: transactionHash },
    } = result.data.ethereum.transfers[0]

    return {
      block: height,
      time: unixtime,
      hash: transactionHash,
      fee: gasValue,
      transfers,
      notifications: [],
    }
  }

  async getTransactionsByAddress(address: string, page: number): Promise<TransactionHistoryResponse> {
    const limit = 10
    const offset = limit * (page - 1)

    const result = await this.client
      .query(bitqueryGetTransactionsByAddressQuery, {
        address,
        limit,
        offset,
        network: BITQUERY_NETWORK_BY_NETWORK_TYPE[this.networkType],
      })
      .toPromise()

    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('Address does not have transactions')

    const totalCount = result.data.ethereum.sentCount.count + result.data.ethereum.receiverCount.count
    const mixedTransfers = [...(result?.data?.ethereum?.sent ?? []), ...(result?.data?.ethereum?.received ?? [])]

    const transactions = new Map<string, TransactionResponse>()

    mixedTransfers.forEach(transfer => {
      const transactionTransfer = this.parseTransactionTransfer(transfer)

      const existingTransaction = transactions.get(transfer.transaction.hash)
      if (existingTransaction) {
        existingTransaction.transfers.push(transactionTransfer)
        return
      }

      transactions.set(transfer.transaction.hash, {
        block: transfer.block.height,
        hash: transfer.transaction.hash,
        time: transfer.block.timestamp.unixtime,
        fee: transfer.transaction.gasValue,
        transfers: [transactionTransfer],
        notifications: [],
      })
    })

    return {
      totalCount,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(): Promise<ContractResponse> {
    throw new Error("Bitquery doesn't support contract info")
  }

  async getTokenInfo(hash: string): Promise<Token> {
    const localToken = TOKENS[this.networkType].find(token => token.hash === hash)
    if (localToken) return localToken

    const result = await this.client
      .query(bitqueryGetTokenInfoQuery, {
        hash,
        network: BITQUERY_NETWORK_BY_NETWORK_TYPE[this.networkType],
      })
      .toPromise()

    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('Token not found')

    const {
      address: { address },
      currency: { decimals, name, symbol, tokenType },
    } = result.data.ethereum.smartContractCalls[0].smartContract

    if (tokenType !== 'ERC20') throw new Error('Token is not ERC20')

    return {
      hash: address,
      name,
      symbol,
      decimals,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const result = await this.client
      .query(bitqueryGetBalanceQuery, {
        address,
        network: BITQUERY_NETWORK_BY_NETWORK_TYPE[this.networkType],
      })
      .toPromise()

    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('Balance not found')

    const balances = result.data.ethereum.address[0].balances.map(
      ({ value, currency: { address, decimals, name, symbol } }): BalanceResponse => ({
        amount: value,
        token: {
          hash: address,
          symbol,
          name,
          decimals,
        },
      })
    )

    return balances
  }

  private parseTransactionTransfer({
    amount,
    currency: { tokenType, address, decimals, name, symbol },
    entityId,
    sender,
    receiver,
  }: BitqueryTransaction): TransactionTransferAsset | TransactionTransferNft {
    if (tokenType === 'ERC721') {
      return {
        from: sender.address,
        to: receiver.address,
        tokenId: entityId,
        contractHash: address,
        type: 'nft',
      }
    }

    return {
      from: sender.address,
      to: receiver.address,
      contractHash: address,
      amount: amount,
      token: {
        decimals: decimals,
        hash: address,
        name: name,
        symbol: symbol,
      },
      type: 'token',
    }
  }
}
