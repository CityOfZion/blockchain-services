import {
  BalanceResponse,
  ContractResponse,
  NetworkType,
  Token,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
  Network,
} from '@cityofzion/blockchain-service'
import { BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE, BITQUERY_MIRROR_URL, NATIVE_ASSETS, TOKENS } from './constants'
import { RpcBDSEthereum } from './RpcBDSEthereum'
import axios, { AxiosInstance } from 'axios'

type BitqueryTransaction = {
  block: {
    timestamp: {
      unixtime: number
    }
    height: number
  }
  transaction: {
    gasValue: number
    hash: string
  }
  amount: number
  currency: {
    address: string
    tokenType: string
    decimals: number
    symbol: string
    name: string
  }
  sender: {
    address: string
  }
  receiver: {
    address: string
  }
  entityId: string
}

type BitqueryGetTransactionsByAddressResponse = {
  ethereum: {
    sent: BitqueryTransaction[]
    received: BitqueryTransaction[]
    sentCount: {
      count: number
    }[]
    receiverCount: {
      count: number
    }[]
  }
}

type BitqueryGetTransactionResponse = {
  ethereum: {
    transfers: BitqueryTransaction[]
  }
}

type BitqueryGetContractResponse = {
  ethereum: {
    smartContractCalls: {
      smartContract: {
        address: {
          address: string
        }
        currency: {
          symbol: string
          name: string
          decimals: number
          tokenType: string
        }
      }
    }[]
  }
}

type BitqueryGetBalanceResponse = {
  ethereum: {
    address: {
      balance: number
      balances:
        | {
            currency: {
              address: string
              symbol: string
              name: string
              decimals: number
            }
            value: number
          }[]
        | null
    }[]
  }
}

export class BitqueryBDSEthereum extends RpcBDSEthereum {
  readonly #client: AxiosInstance
  readonly #networkType: Exclude<NetworkType, 'custom'>

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 8

  constructor(network: Network) {
    super(network)

    if (network.type === 'custom') throw new Error('Custom network not supported')
    this.#networkType = network.type

    this.#client = axios.create({
      baseURL: BITQUERY_MIRROR_URL,
    })
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const result = await this.#client.get<BitqueryGetTransactionResponse>(`/get-transaction/${hash}`, {
      params: { network: BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE[this.#networkType] },
    })

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
      fee: String(gasValue),
      transfers,
      notifications: [],
    }
  }

  async getTransactionsByAddress({
    address,
    page = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const limit = 10
    const offset = limit * (page - 1)

    const result = await this.#client.get<BitqueryGetTransactionsByAddressResponse>(`/get-transactions/${address}`, {
      params: { network: BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE[this.#networkType], limit, offset },
    })

    if (!result.data) throw new Error('Address does not have transactions')

    const totalCount =
      (result.data.ethereum.sentCount[0].count ?? 0) + (result.data.ethereum.receiverCount[0].count ?? 0)
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
        fee: String(transfer.transaction.gasValue),
        transfers: [transactionTransfer],
        notifications: [],
      })
    })

    return {
      totalCount,
      limit: limit * 2,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(): Promise<ContractResponse> {
    throw new Error("Bitquery doesn't support contract info")
  }

  async getTokenInfo(hash: string): Promise<Token> {
    const localToken = TOKENS[this.#networkType].find(token => token.hash === hash)
    if (localToken) return localToken

    const result = await this.#client.get<BitqueryGetContractResponse>(`/get-token-info/${hash}`, {
      params: { network: BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE[this.#networkType] },
    })

    if (!result.data || result.data.ethereum.smartContractCalls.length <= 0) throw new Error('Token not found')

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
    const result = await this.#client.get<BitqueryGetBalanceResponse>(`/get-balance/${address}`, {
      params: { network: BITQUERY_MIRROR_NETWORK_BY_NETWORK_TYPE[this.#networkType] },
    })

    const data = result.data?.ethereum.address[0].balances ?? []
    const ethBalance = result.data?.ethereum.address[0].balance ?? 0
    const ethToken = NATIVE_ASSETS.find(asset => asset.symbol === 'ETH')!

    const balances: BalanceResponse[] = [
      {
        amount: ethBalance.toString(),
        token: ethToken,
      },
    ]

    data.forEach(({ value, currency: { address, decimals, name, symbol } }) => {
      if (value < 0 || address === ethToken.hash) return

      balances.push({
        amount: value.toString(),
        token: {
          hash: address,
          symbol,
          name,
          decimals,
        },
      })
    })

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
      amount: amount.toString(),
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
