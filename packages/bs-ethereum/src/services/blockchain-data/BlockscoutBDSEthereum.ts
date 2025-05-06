import {
  BalanceResponse,
  BSCommonConstants,
  ContractMethod,
  ContractResponse,
  ExplorerService,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  Network,
  NftDataService,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import axios from 'axios'
import { ethers } from 'ethers'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { api } from '@cityofzion/dora-ts'
import { DoraBDSEthereum } from './DoraBDSEthereum'

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
  raw_input: string
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
  decimals: string | null
  address: string
  symbol: string
  type: string
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

export class BlockscoutBDSEthereum extends DoraBDSEthereum {
  static BASE_URL_BY_CHAIN_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    [BSEthereumConstants.NEOX_MAINNET_NETWORK_ID]: `${BSCommonConstants.DORA_URL}/api/neox/mainnet`,
    [BSEthereumConstants.NEOX_TESTNET_NETWORK_ID]: 'https://dora-stage.coz.io/api/neox/testnet',
  }

  static isNeoX(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.NEOX_NETWORK_IDS.includes(network.id)
  }

  static getClient(network: Network<BSEthereumNetworkId>) {
    const baseURL = BlockscoutBDSEthereum.BASE_URL_BY_CHAIN_ID[network.id]

    if (!baseURL) {
      throw new Error('Unsupported network')
    }

    return axios.create({
      baseURL,
    })
  }

  constructor(network: Network<BSEthereumNetworkId>, nftDataService: NftDataService, explorerService: ExplorerService) {
    super(
      network,
      [BSEthereumConstants.NEOX_MAINNET_NETWORK_ID, BSEthereumConstants.NEOX_TESTNET_NETWORK_ID],
      nftDataService,
      explorerService
    )
  }

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5

  async getTransaction(txid: string): Promise<TransactionResponse> {
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getTransaction(txid)
    }

    const client = BlockscoutBDSEthereum.getClient(this._network)
    const { data } = await client.get<BlockscoutTransactionResponse>(`/transactions/${txid}`)

    if (!data || 'message' in data) {
      throw new Error('Transaction not found')
    }

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    const hasNativeTokenBeingTransferred = data.value !== '0'
    if (hasNativeTokenBeingTransferred) {
      transfers.push({
        amount: ethers.utils.formatUnits(data.value, nativeToken.decimals),
        from: data.from.hash,
        to: data.to.hash,
        type: 'token',
        contractHash: nativeToken.hash,
        token: nativeToken,
      })
    }

    const hasTokenTransfers = data.token_transfers && data.token_transfers.length > 0
    if (hasTokenTransfers) {
      for (const tokenTransfer of data.token_transfers) {
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
              decimals: Number(tokenTransfer.total.decimals),
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
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getTransactionsByAddress(params)
    }

    const client = BlockscoutBDSEthereum.getClient(this._network)
    const { data } = await client.get<BlockscoutTransactionByAddressResponse>(
      `/addresses/${params.address}/transactions`,
      {
        params: {
          next_page_params: params.nextPageParams,
        },
      }
    )

    if (!data || 'message' in data) {
      throw new Error('Transactions not found')
    }

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const transactions: TransactionResponse[] = []

    const promises = data.items.map(async item => {
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

      if (item.raw_input) {
        try {
          const ERC20Interface = new ethers.utils.Interface(ERC20_ABI)

          const result = ERC20Interface.decodeFunctionData('transfer', item.raw_input)
          if (!result) throw new Error('Invalid ERC20 transfer')

          const contractHash = item.to.hash

          const token = await this.getTokenInfo(contractHash)

          const to = result[0]
          const value = result[1]

          transfers.push({
            amount: ethers.utils.formatUnits(value, token.decimals),
            from: item.from.hash,
            to,
            type: 'token',
            contractHash: item.to.hash,
            token,
          })
        } catch (error) {
          /* empty */
        }
      }

      transactions.push({
        block: item.block,
        hash: item.hash,
        fee: ethers.utils.formatUnits(item.fee.value, nativeToken.decimals),
        time: new Date(item.timestamp).getTime() / 1000,
        notifications: [],
        transfers,
      })
    })

    await Promise.allSettled(promises)

    return {
      transactions,
      nextPageParams: data.next_page_params,
    }
  }

  async getFullTransactionsByAddress(
    params: FullTransactionsByAddressParams
  ): Promise<FullTransactionsByAddressResponse> {
    this.validateFullTransactionsByAddressParams(params)

    const response = await api.NeoXREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._network.id === BSEthereumConstants.NEOX_TESTNET_NETWORK_ID ? 'testnet' : 'mainnet',
      cursor: params.nextCursor,
    })

    return await this.transformFullTransactionsByAddressResponse(response)
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getContract(contractHash)
    }

    try {
      const client = BlockscoutBDSEthereum.getClient(this._network)

      const { data } = await client.get<BlockscoutSmartContractResponse>(`/smart-contracts/${contractHash}`)

      if (!data || 'message' in data) {
        throw new Error('Contract not found')
      }

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
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getTokenInfo(tokenHash)
    }

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._network)

    if (BSEthereumHelper.normalizeHash(nativeAsset.hash) === BSEthereumHelper.normalizeHash(tokenHash)) {
      return nativeAsset
    }

    if (this._tokenCache.has(tokenHash)) {
      return this._tokenCache.get(tokenHash)!
    }

    const client = BlockscoutBDSEthereum.getClient(this._network)

    const { data } = await client.get<BlockscoutTokensResponse>(`/tokens/${tokenHash}`)
    if (!data || 'message' in data) {
      throw new Error('Token not found')
    }

    if (data.type !== 'ERC-20') {
      throw new Error('Token is not an ERC-20 token')
    }

    return {
      decimals: data.decimals ? parseInt(data.decimals) : BSEthereumConstants.DEFAULT_DECIMALS,
      hash: tokenHash,
      name: data.name,
      symbol: data.symbol,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getBalance(address)
    }

    const client = BlockscoutBDSEthereum.getClient(this._network)

    const { data: nativeBalance } = await client.get<{ coin_balance: string }>(`/addresses/${address}`)
    if (!nativeBalance || 'message' in nativeBalance) {
      throw new Error('Native balance not found')
    }

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const balances: BalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance.coin_balance, nativeToken.decimals),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await client.get<BlockscoutBalanceResponse[]>(
      `/addresses/${address}/token-balances`
    )
    if (!erc20Balances || 'message' in erc20Balances) {
      throw new Error('ERC20 balance not found')
    }

    erc20Balances.forEach(balance => {
      try {
        if (balance.token.type !== 'ERC-20') {
          return
        }

        const token: Token = {
          decimals: balance.token.decimals ? parseInt(balance.token.decimals) : BSEthereumConstants.DEFAULT_DECIMALS,
          hash: balance.token.address,
          name: balance.token.symbol,
          symbol: balance.token.symbol,
        }

        balances.push({
          amount: ethers.utils.formatUnits(balance.value, token.decimals),
          token,
        })
      } catch {
        /* empty */
      }
    })

    return balances
  }

  async getBlockHeight(): Promise<number> {
    if (!BlockscoutBDSEthereum.isNeoX(this._network)) {
      return super.getBlockHeight()
    }

    const client = BlockscoutBDSEthereum.getClient(this._network)

    const { data } = await client.get<BlockscoutBlocksResponse>('/blocks')
    if (!data || 'message' in data) {
      throw new Error('Block not found')
    }

    return data.items[0].height
  }
}
