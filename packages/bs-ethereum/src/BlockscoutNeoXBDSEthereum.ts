import {
  BalanceResponse,
  ContractMethod,
  ContractResponse,
  Network,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import axios from 'axios'
import { RpcBDSEthereum } from './RpcBDSEthereum'
import { BSEthereumHelper, BSEthereumNetworkId } from './BSEthereumHelper'
import { ethers } from 'ethers'
import { ERC20_ABI } from './assets/abis/ERC20'

interface BlockscoutTransactionResponse {
  fee: {
    value: string
  }
  hash: string
  block: number
  timestamp: string
  value: string
  from: {
    hash: string
  }
  to: {
    hash: string
  }
  token_transfers: {
    token: {
      type: string
      address: string
      symbol: string
      name: string
    }
    from: {
      hash: string
    }
    to: {
      hash: string
    }
    total: {
      value: string
      decimals: number
      token_id: string
    }
  }[]
}

interface NextPageParams {
  block_number: number
  fee: string
  hash: string
  index: number
  inserted_at: string
  items_count: number
  value: string
}

interface BlockscoutTransactionByAddressResponse {
  items: BlockscoutTransactionResponse[]
  next_page_params?: NextPageParams | null
}

interface BlockscoutTokensResponse {
  name: string
  decimals: string
  address: string
  symbol: string
}

interface BlockscoutBlocksResponse {
  items: {
    height: number
  }[]
}

interface BlockscoutBalanceResponse {
  token: BlockscoutTokensResponse
  token_id: string | null
  value: string
}

interface BlockscoutSmartContractResponse {
  name: string
  abi: typeof ERC20_ABI
}

export class BlockscoutNeoXBDSEthereum extends RpcBDSEthereum {
  static BASE_URL_BY_CHAIN_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    '12227332': 'https://dora-stage.coz.io/api/neox/testnet',
    '47763': 'https://dora.coz.io/api/neox/mainnet',
  }

  static isSupported(network: Network<BSEthereumNetworkId>) {
    return !!BlockscoutNeoXBDSEthereum.BASE_URL_BY_CHAIN_ID[network.id]
  }

  static getClient(network: Network<BSEthereumNetworkId>) {
    const baseURL = BlockscoutNeoXBDSEthereum.BASE_URL_BY_CHAIN_ID[network.id]

    if (!baseURL) {
      throw new Error('Unsupported network')
    }

    return axios.create({
      baseURL,
    })
  }

  constructor(network: Network<BSEthereumNetworkId>) {
    super(network)
  }

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5

  async getTransaction(txid: string): Promise<TransactionResponse> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getTransaction(txid)
    }

    const client = BlockscoutNeoXBDSEthereum.getClient(this._network)
    const { data } = await client.get<BlockscoutTransactionResponse>(`/transactions/${txid}`)

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)
    const transfers = this.#parseTransfers(data, nativeToken)

    return {
      block: data.block,
      hash: data.hash,
      fee: ethers.utils.formatUnits(data.fee.value, nativeToken.decimals),
      time: new Date(data.timestamp).getTime() / 1000,
      notifications: [],
      transfers,
    }
  }

  async getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getTransactionsByAddress(params)
    }

    const client = BlockscoutNeoXBDSEthereum.getClient(this._network)
    const { data } = await client.get<BlockscoutTransactionByAddressResponse>(
      `/addresses/${params.address}/transactions`,
      {
        params: {
          next_page_params: params.nextPageParams,
        },
      }
    )

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const transactions: TransactionResponse[] = []

    data.items.forEach(item => {
      const transfers = this.#parseTransfers(item, nativeToken)

      transactions.push({
        block: item.block,
        hash: item.hash,
        fee: ethers.utils.formatUnits(item.fee.value, nativeToken.decimals),
        time: new Date(item.timestamp).getTime() / 1000,
        notifications: [],
        transfers,
      })
    })

    return {
      transactions,
      nextPageParams: data.next_page_params,
    }
  }

  #parseTransfers(
    item: BlockscoutTransactionResponse,
    nativeToken: { symbol: string; name: string; hash: string; decimals: number }
  ) {
    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    const hasNativeTokenBeingTransferred = item.value !== '0'
    if (hasNativeTokenBeingTransferred) {
      transfers.push({
        amount: ethers.utils.formatUnits(item.value, nativeToken.decimals),
        from: item.from.hash,
        to: item.to.hash,
        type: 'token',
        contractHash: nativeToken.hash,
        token: nativeToken,
      })
    }

    const hasTokenTransfers = item.token_transfers && item.token_transfers.length > 0
    if (hasTokenTransfers) {
      for (const tokenTransfer of item.token_transfers) {
        if (tokenTransfer.token.type === 'ERC-20') {
          transfers.push({
            amount: ethers.utils.formatUnits(tokenTransfer.total.value, tokenTransfer.total.decimals),
            from: tokenTransfer.from.hash,
            to: tokenTransfer.to.hash,
            type: 'token',
            contractHash: tokenTransfer.token.address,
            token: {
              symbol: tokenTransfer.token.symbol,
              name: tokenTransfer.token.name,
              hash: tokenTransfer.token.address,
              decimals: tokenTransfer.total.decimals,
            },
          })

          continue
        }

        if (tokenTransfer.token.type === 'ERC-721') {
          transfers.push({
            tokenId: tokenTransfer.total.token_id,
            from: tokenTransfer.from.hash,
            to: tokenTransfer.to.hash,
            type: 'nft',
            contractHash: tokenTransfer.token.address,
          })
        }
      }
    }

    return transfers
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getContract(contractHash)
    }

    try {
      const client = BlockscoutNeoXBDSEthereum.getClient(this._network)

      const { data } = await client.get<BlockscoutSmartContractResponse>(`/smart-contracts/${contractHash}`)
      const methods: ContractMethod[] = []

      data.abi.forEach(abi => {
        if (abi.type !== 'function') return

        const parameters = abi.inputs?.map(param => ({
          name: param.name,
          type: param.type,
        }))

        methods.push({
          name: abi.name ?? '',
          parameters: parameters ?? [],
        })
      })

      return {
        hash: contractHash,
        name: data.name,
        methods,
      }
    } catch (error) {
      throw new Error('Contract not found or not supported')
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getTokenInfo(tokenHash)
    }

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._network)

    if (BSEthereumHelper.normalizeHash(nativeAsset.hash) === BSEthereumHelper.normalizeHash(tokenHash)) {
      return nativeAsset
    }

    if (this._tokenCache.has(tokenHash)) {
      return this._tokenCache.get(tokenHash)!
    }

    const client = BlockscoutNeoXBDSEthereum.getClient(this._network)

    const { data } = await client.get<BlockscoutTokensResponse>(`/tokens/${tokenHash}`)

    return {
      decimals: parseInt(data.decimals),
      hash: tokenHash,
      name: data.name,
      symbol: data.symbol,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getBalance(address)
    }

    const client = BlockscoutNeoXBDSEthereum.getClient(this._network)

    const { data: nativeBalance } = await client.get<{ coin_balance: string }>(`/addresses/${address}`)

    const balances: BalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance.coin_balance, 18),
        token: BSEthereumHelper.getNativeAsset(this._network),
      },
    ]

    const { data: erc20Balances } = await client.get<BlockscoutBalanceResponse[]>(
      `/addresses/${address}/token-balances`
    )

    erc20Balances.forEach(balance => {
      const token: Token = {
        decimals: parseInt(balance.token.decimals),
        hash: balance.token.address,
        name: balance.token.symbol,
        symbol: balance.token.symbol,
      }

      balances.push({
        amount: ethers.utils.formatUnits(balance.value, token.decimals),
        token,
      })
    })

    return balances
  }

  async getBlockHeight(): Promise<number> {
    if (!BlockscoutNeoXBDSEthereum.isSupported(this._network)) {
      return super.getBlockHeight()
    }

    const client = BlockscoutNeoXBDSEthereum.getClient(this._network)

    const { data } = await client.get<BlockscoutBlocksResponse>('/blocks')

    return data.items[0].height
  }
}
