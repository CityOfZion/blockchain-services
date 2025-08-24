import {
  BalanceResponse,
  BSBigNumberHelper,
  BSCommonConstants,
  BSFullTransactionsByAddressHelper,
  BSPromisesHelper,
  ContractMethod,
  ContractResponse,
  ExportTransactionsByAddressParams,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  NftResponse,
  TBridgeToken,
  TNetwork,
  Token,
  TransactionBridgeNeo3NeoXResponse,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import axios from 'axios'
import { ethers } from 'ethers'
import { api } from '@cityofzion/dora-ts'
import { BSEthereumConstants, ERC20_ABI, RpcBDSEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { Neo3NeoXBridgeService } from '../neo3neoXBridge/Neo3NeoXBridgeService'
import { wallet } from '@cityofzion/neon-js'
import {
  IBSNeoX,
  TBlockscoutBDSNeoXBalanceApiResponse,
  TBlockscoutBDSNeoXBlocksApiResponse,
  TBlockscoutBDSNeoXSmartContractApiResponse,
  TBlockscoutBDSNeoXTokensApiResponse,
  TBlockscoutBDSNeoXTransactionApiResponse,
  TBlockscoutBDSNeoXTransactionByAddressApiResponse,
  TBSNeoXNetworkId,
} from '../../types'

export class BlockscoutBDSNeoX<N extends string> extends RpcBDSEthereum<N, TBSNeoXNetworkId, IBSNeoX<N>> {
  static readonly BASE_URL_BY_CHAIN_ID: Partial<Record<TBSNeoXNetworkId, string>> = {
    '47763': `${BSCommonConstants.DORA_URL}/api/neox/mainnet`,
    '12227332': 'https://dora-stage.coz.io/api/neox/testnet',
  }
  static readonly FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS: TBSNeoXNetworkId[] = ['12227332', '47763']
  static readonly FULL_TRANSACTIONS_ERC721_STANDARDS = ['erc721', 'erc-721']
  static readonly FULL_TRANSACTIONS_ERC1155_STANDARDS = ['erc1155', 'erc-1155']
  static readonly FULL_TRANSACTIONS_ERC20_STANDARDS = ['erc20', 'erc-20']

  static getClient(network: TNetwork<TBSNeoXNetworkId>) {
    const baseURL = BlockscoutBDSNeoX.BASE_URL_BY_CHAIN_ID[network.id]
    if (!baseURL) throw new Error('Unsupported network')

    return axios.create({ baseURL })
  }

  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5

  constructor(service: IBSNeoX<N>) {
    super(service)
  }

  async getTransaction(txid: string): Promise<TransactionResponse> {
    const client = BlockscoutBDSNeoX.getClient(this._service.network)
    const { data } = await client.get<TBlockscoutBDSNeoXTransactionApiResponse>(`/transactions/${txid}`)

    if (!data || 'message' in data) {
      throw new Error('Transaction not found')
    }

    const nativeToken = BSNeoXConstants.NATIVE_ASSET
    const to = data.to?.hash
    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    const hasNativeTokenBeingTransferred = data.value !== '0'
    if (hasNativeTokenBeingTransferred) {
      transfers.push({
        amount: ethers.utils.formatUnits(data.value, nativeToken.decimals),
        from: data.from.hash,
        to,
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
            token: this._service.tokenService.normalizeToken({
              symbol: tokenTransfer.token.symbol,
              name: tokenTransfer.token.name,
              hash: tokenTransfer.token.address,
              decimals: Number(tokenTransfer.total.decimals),
            }),
          })

          continue
        }

        if (tokenTransfer.token.type === 'ERC-721') {
          transfers.push({
            tokenHash: tokenTransfer.total.token_id,
            from: tokenTransfer.from.hash,
            to: tokenTransfer.to.hash,
            type: 'nft',
            collectionHash: tokenTransfer.token.address,
          })
        }
      }
    }

    let transaction: TransactionResponse = {
      block: data.block,
      hash: data.hash,
      fee: ethers.utils.formatUnits(data.fee.value, nativeToken.decimals),
      time: new Date(data.timestamp).getTime() / 1000,
      notifications: [],
      transfers,
      type: 'default',
    }

    if (to === Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH) {
      await BSPromisesHelper.tryCatch(() => {
        const bridgeNeo3NeoXData = this.#getBridgeNeo3NeoXDataByBlockscoutTransaction(data)
        if (bridgeNeo3NeoXData) transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
      })
    }

    return transaction
  }

  async getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const client = BlockscoutBDSNeoX.getClient(this._service.network)
    const { data } = await client.get<TBlockscoutBDSNeoXTransactionByAddressApiResponse>(
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

    const nativeToken = BSNeoXConstants.NATIVE_ASSET

    const transactions: TransactionResponse[] = []

    const promises = data.items.map(async item => {
      const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []
      const to = item.to?.hash
      const hasNativeTokenBeingTransferred = item.value !== '0'

      if (hasNativeTokenBeingTransferred) {
        transfers.push({
          amount: ethers.utils.formatUnits(item.value, nativeToken.decimals),
          from: item.from.hash,
          to,
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
            contractHash: token.hash,
            token,
          })
        } catch (error) {
          /* empty */
        }
      }

      let transaction: TransactionResponse = {
        block: item.block,
        hash: item.hash,
        fee: ethers.utils.formatUnits(item.fee.value, nativeToken.decimals),
        time: new Date(item.timestamp).getTime() / 1000,
        notifications: [],
        transfers,
        type: 'default',
      }

      if (to === Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH) {
        const [bridgeNeo3NeoXData] = await BSPromisesHelper.tryCatch(() =>
          this.#getBridgeNeo3NeoXDataByBlockscoutTransaction(item)
        )

        if (bridgeNeo3NeoXData) transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
      }

      transactions.push(transaction)
    })

    await Promise.allSettled(promises)

    return {
      transactions,
      nextPageParams: data.next_page_params,
    }
  }

  async getFullTransactionsByAddress({
    nextCursor,
    ...params
  }: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this._service,
      supportedNetworksIds: BlockscoutBDSNeoX.FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    const data: FullTransactionsItem[] = []

    const response = await api.NeoXREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._service.network.type as 'mainnet' | 'testnet',
      cursor: nextCursor,
      pageLimit: params.pageSize ?? 50,
    })

    const items = response.data ?? []

    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this._service.explorerService.getNftTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID

      let newItem: FullTransactionsItem = {
        txId,
        txIdUrl: txId ? txTemplateUrl?.replace('{txId}', txId) : undefined,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? BSBigNumberHelper.format(networkFeeAmount, { decimals: BSNeoXConstants.NATIVE_ASSET.decimals })
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? BSBigNumberHelper.format(systemFeeAmount, { decimals: BSNeoXConstants.NATIVE_ASSET.decimals })
          : undefined,
        events: [],
        type: 'default',
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash } = event

        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isErc1155 = BlockscoutBDSNeoX.FULL_TRANSACTIONS_ERC1155_STANDARDS.includes(standard)
        const isErc721 = BlockscoutBDSNeoX.FULL_TRANSACTIONS_ERC721_STANDARDS.includes(standard)
        const isErc20 = BlockscoutBDSNeoX.FULL_TRANSACTIONS_ERC20_STANDARDS.includes(standard)
        const isNft = (isErc1155 || isErc721) && !!tokenHash

        const from = event.from ?? undefined
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined

        const to = event.to ?? undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined

        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined

        if (isNft) {
          const [nft] = await BSPromisesHelper.tryCatch<NftResponse>(() =>
            this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
          )

          const nftUrl = contractHash
            ? nftTemplateUrl?.replace('{collectionHash}', contractHash).replace('{tokenHash}', tokenHash)
            : undefined

          newItem.events.splice(eventIndex, 0, {
            eventType: 'nft',
            amount: undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            collectionHash: contractHash,
            collectionHashUrl: contractHashUrl,
            tokenHash,
            tokenType: isErc1155 ? 'erc-1155' : 'erc-721',
            nftImageUrl: nft?.image,
            nftUrl,
            name: nft?.name,
            collectionName: nft?.collection?.name,
          })

          return
        }

        const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(contractHash))

        newItem.events.splice(eventIndex, 0, {
          eventType: 'token',
          amount: event.amount
            ? BSBigNumberHelper.format(event.amount, { decimals: token?.decimals ?? event.tokenDecimals })
            : undefined,
          methodName,
          from,
          fromUrl,
          to,
          toUrl,
          contractHash,
          contractHashUrl,
          token: token ?? undefined,
          tokenType: isErc20 ? 'erc-20' : 'generic',
        })

        // Verify if the event is a bridgeNeo3NeoX event
        if (newItem.type === 'default' && to === Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH) {
          await BSPromisesHelper.tryCatch(async () => {
            const client = BlockscoutBDSNeoX.getClient(this._service.network)
            const response = await client.get<TBlockscoutBDSNeoXTransactionApiResponse>(`/transactions/${txId}`)

            const bridgeNeo3NeoXData = this.#getBridgeNeo3NeoXDataByBlockscoutTransaction(response.data)

            if (bridgeNeo3NeoXData) newItem = { ...newItem, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
          })
        }
      })

      await Promise.allSettled(eventPromises)

      data.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor: response.nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this._service,
      supportedNetworksIds: BlockscoutBDSNeoX.FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    return await api.NeoXREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._service.network.type as 'mainnet' | 'testnet',
    })
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    try {
      const client = BlockscoutBDSNeoX.getClient(this._service.network)

      const { data } = await client.get<TBlockscoutBDSNeoXSmartContractApiResponse>(`/smart-contracts/${contractHash}`)

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
    const normalizedHash = this._service.tokenService.normalizeHash(tokenHash)
    const nativeAsset = BSNeoXConstants.NATIVE_ASSET

    if (nativeAsset.hash === normalizedHash) {
      return nativeAsset
    }

    const cachedToken = this._tokenCache.get(tokenHash)
    if (cachedToken) {
      return cachedToken
    }

    const client = BlockscoutBDSNeoX.getClient(this._service.network)

    const { data } = await client.get<TBlockscoutBDSNeoXTokensApiResponse>(`/tokens/${tokenHash}`)
    if (!data || 'message' in data) {
      throw new Error('Token not found')
    }

    if (data.type !== 'ERC-20') {
      throw new Error('Token is not an ERC-20 token')
    }

    const token = this._service.tokenService.normalizeToken({
      decimals: data.decimals ? parseInt(data.decimals) : BSEthereumConstants.DEFAULT_DECIMALS,
      hash: tokenHash,
      name: data.name,
      symbol: data.symbol,
    })

    this._tokenCache.set(tokenHash, token)

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const client = BlockscoutBDSNeoX.getClient(this._service.network)

    const { data: nativeBalance } = await client.get<{ coin_balance: string }>(`/addresses/${address}`)
    if (!nativeBalance || 'message' in nativeBalance) {
      throw new Error('Native balance not found')
    }

    const nativeToken = BSNeoXConstants.NATIVE_ASSET

    const balances: BalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance.coin_balance, nativeToken.decimals),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await client.get<TBlockscoutBDSNeoXBalanceApiResponse[]>(
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

        const token: Token = this._service.tokenService.normalizeToken({
          decimals: balance.token.decimals ? parseInt(balance.token.decimals) : BSEthereumConstants.DEFAULT_DECIMALS,
          hash: balance.token.address,
          name: balance.token.symbol,
          symbol: balance.token.symbol,
        })

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
    const client = BlockscoutBDSNeoX.getClient(this._service.network)

    const { data } = await client.get<TBlockscoutBDSNeoXBlocksApiResponse>('/blocks')
    if (!data || 'message' in data) {
      throw new Error('Block not found')
    }

    return data.items[0].height
  }

  #getBridgeNeo3NeoXDataByBlockscoutTransaction(
    transactionResponse: TBlockscoutBDSNeoXTransactionApiResponse
  ): TransactionBridgeNeo3NeoXResponse['data'] | undefined {
    const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)
    const input = BridgeInterface.parseTransaction({ data: transactionResponse.raw_input })

    const to = input.args._to
    const receiverAddress = wallet.getAddressFromScriptHash(to.startsWith('0x') ? to.slice(2) : to)

    let token: TBridgeToken | undefined
    let amountInDecimals: string | undefined

    if (input.name === 'withdrawNative') {
      token = this._service.neo3NeoXBridgeService.tokens.find(token =>
        this._service.tokenService.predicateByHash(BSNeoXConstants.NATIVE_ASSET, token)
      )
      amountInDecimals = transactionResponse.value
    } else if (input.name === 'withdrawToken') {
      token = this._service.neo3NeoXBridgeService.tokens.find(token =>
        this._service.tokenService.predicateByHash(BSNeoXConstants.NEO_TOKEN, token)
      )
      amountInDecimals = input.args._amount.toString()
    }

    if (!token || !amountInDecimals) return undefined

    return {
      token,
      receiverAddress,
      amount: BSBigNumberHelper.toNumber(BSBigNumberHelper.fromDecimals(amountInDecimals, token.decimals)),
    }
  }
}
