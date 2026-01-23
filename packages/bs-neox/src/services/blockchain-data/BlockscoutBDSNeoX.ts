import {
  TBalanceResponse,
  BSBigNumberHelper,
  BSCommonConstants,
  TContractMethod,
  TBridgeToken,
  TBSNetwork,
  TBSToken,
  TBigNumber,
  type TTransaction,
  BSUtilsHelper,
  type TTransactionBridgeNeo3NeoX,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TContractResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { ethers } from 'ethers'
import { BSEthereumConstants, ERC20_ABI, RpcBDSEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { Neo3NeoXBridgeService } from '../neo3neoXBridge/Neo3NeoXBridgeService'
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
import { BSNeo3NeonJsSingletonHelper } from '@cityofzion/bs-neo3'

export class BlockscoutBDSNeoX<N extends string> extends RpcBDSEthereum<N, TBSNeoXNetworkId, IBSNeoX<N>> {
  static readonly BASE_URL_BY_CHAIN_ID: Partial<Record<TBSNeoXNetworkId, string>> = {
    '47763': `${BSCommonConstants.COZ_API_URL}/api/neox/mainnet`,
    '12227332': 'https://dora-stage.coz.io/api/neox/testnet',
  }

  static getClient(network: TBSNetwork<TBSNeoXNetworkId>) {
    const baseURL = BlockscoutBDSNeoX.BASE_URL_BY_CHAIN_ID[network.id]
    if (!baseURL) throw new Error('Unsupported network')

    return axios.create({ baseURL })
  }

  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 5 // 5 minutes
  readonly #apiInstance?: AxiosInstance

  constructor(service: IBSNeoX<N>) {
    super(service)
  }

  get #api() {
    if (!this.#apiInstance) {
      return BlockscoutBDSNeoX.getClient(this._service.network)
    }

    return this.#apiInstance
  }

  async getTransaction(txid: string): Promise<TTransaction> {
    const { data: response } = await this.#api.get<TBlockscoutBDSNeoXTransactionApiResponse>(`/transactions/${txid}`)

    if (!response || 'message' in response) {
      throw new Error('Transaction not found')
    }

    const nativeToken = BSNeoXConstants.NATIVE_ASSET
    const to = response.to?.hash
    const events: TTransaction['events'] = []

    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()
    const nftTemplateUrl = this._service.explorerService.getNftTemplateUrl()

    const hasNativeTokenBeingTransferred = response.value !== '0'
    if (hasNativeTokenBeingTransferred) {
      const from = response.from.hash
      const to = response.to.hash
      const fromUrl = addressTemplateUrl?.replace('{address}', from)
      const toUrl = addressTemplateUrl?.replace('{address}', to)

      const contractHashUrl = contractTemplateUrl?.replace('{hash}', nativeToken.hash)

      events.push({
        amount: ethers.utils.formatUnits(response.value, nativeToken.decimals),
        from,
        fromUrl,
        to,
        toUrl,
        eventType: 'token',
        contractHash: nativeToken.hash,
        contractHashUrl,
        token: nativeToken,
        methodName: 'transfer',
        tokenType: 'native',
      })
    }

    const hasTokenTransfers = response.token_transfers && response.token_transfers.length > 0
    if (hasTokenTransfers) {
      const promises = response.token_transfers.map(async tokenTransfer => {
        const from = tokenTransfer.from.hash
        const to = tokenTransfer.to.hash
        const contractHash = tokenTransfer.token.address

        const fromUrl = addressTemplateUrl?.replace('{address}', from)
        const toUrl = addressTemplateUrl?.replace('{address}', to)
        const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

        if (tokenTransfer.token.type === 'ERC-20') {
          events.push({
            amount: ethers.utils.formatUnits(tokenTransfer.total.value, tokenTransfer.total.decimals),
            from,
            fromUrl,
            to,
            toUrl,
            eventType: 'token',
            contractHash,
            contractHashUrl,
            methodName: 'transfer',
            tokenType: 'erc-20',
            token: this._service.tokenService.normalizeToken({
              symbol: tokenTransfer.token.symbol,
              name: tokenTransfer.token.name,
              hash: tokenTransfer.token.address,
              decimals: Number(tokenTransfer.total.decimals),
            }),
          })

          return
        }

        const tokenHash = tokenTransfer.total.token_id

        const [nft] = await BSUtilsHelper.tryCatch(() =>
          this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
        )

        const nftUrl = nftTemplateUrl?.replace('{collectionHash}', contractHash).replace('{tokenHash}', tokenHash)

        if (tokenTransfer.token.type === 'ERC-721') {
          events.push({
            tokenHash,
            from,
            fromUrl,
            to,
            toUrl,
            eventType: 'nft',
            methodName: 'transfer',
            tokenType: 'erc-721',
            amount: '1',
            collectionHash: tokenTransfer.token.address,
            collectionHashUrl: contractHashUrl,
            collectionName: nft?.collection?.name,
            name: nft?.name,
            nftImageUrl: nft?.image,
            nftUrl,
          })
        }
      })

      await Promise.allSettled(promises)
    }

    const txId = response.hash
    const txIdUrl = txTemplateUrl?.replace('{tx}', txId)

    let transaction: TTransaction = {
      block: response.block,
      txId,
      txIdUrl,
      events,
      networkFeeAmount: ethers.utils.formatEther(response.fee.value),
      systemFeeAmount: ethers.utils.formatEther(0),
      date: new Date(response.timestamp).toISOString(),
      invocationCount: 0,
      notificationCount: 0,
      type: 'default',
    }

    if (to === Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH) {
      const [bridgeNeo3NeoXData] = BSUtilsHelper.tryCatch(() =>
        this.#getBridgeNeo3NeoXDataByBlockscoutTransaction(response)
      )

      if (bridgeNeo3NeoXData) {
        transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
      }
    }

    return transaction
  }

  async getTransactionsByAddress(params: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse> {
    const { data } = await this.#api.get<TBlockscoutBDSNeoXTransactionByAddressApiResponse>(
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

    const transactions: TTransaction[] = []

    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()

    const promises = data.items.map(async item => {
      const events: TTransaction['events'] = []

      const hasNativeTokenBeingTransferred = item.value !== '0'

      if (hasNativeTokenBeingTransferred) {
        const to = item.to?.hash
        const from = item.from.hash
        const contractHash = nativeToken.hash

        const fromUrl = addressTemplateUrl?.replace('{address}', from)
        const toUrl = addressTemplateUrl?.replace('{address}', to)
        const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

        events.push({
          amount: ethers.utils.formatUnits(item.value, nativeToken.decimals),
          from: item.from.hash,
          fromUrl,
          to,
          toUrl,
          eventType: 'token',
          methodName: 'transfer',
          tokenType: 'native',
          contractHash: nativeToken.hash,
          contractHashUrl,
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

          const from = item.from.hash
          const to = result[0]
          const value = result[1]

          const fromUrl = addressTemplateUrl?.replace('{address}', from)
          const toUrl = addressTemplateUrl?.replace('{address}', to)
          const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

          events.push({
            amount: ethers.utils.formatUnits(value, token.decimals),
            from: item.from.hash,
            fromUrl,
            to,
            toUrl,
            eventType: 'token',
            methodName: 'transfer',
            tokenType: 'erc-20',
            contractHash: token.hash,
            contractHashUrl,
            token,
          })
        } catch {
          /* empty */
        }
      }

      if (events.length === 0) {
        return
      }

      const txId = item.hash
      const txIdUrl = txTemplateUrl?.replace('{txId}', txId)

      let transaction: TTransaction = {
        block: item.block,
        txId,
        txIdUrl,
        date: new Date(item.timestamp).toISOString(),
        invocationCount: 0,
        notificationCount: 0,
        networkFeeAmount: ethers.utils.formatEther(item.fee.value),
        systemFeeAmount: ethers.utils.formatEther(0),
        events,
        type: 'default',
      }

      const hasBridgeNeo3NeoXEvent = events.some(event => event.to === Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH)

      if (hasBridgeNeo3NeoXEvent) {
        const [bridgeNeo3NeoXData] = BSUtilsHelper.tryCatch(() =>
          this.#getBridgeNeo3NeoXDataByBlockscoutTransaction(item)
        )

        if (bridgeNeo3NeoXData) {
          transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
        }
      }

      transactions.push(transaction)
    })

    await Promise.allSettled(promises)

    return {
      data: transactions,
      nextPageParams: data.next_page_params,
    }
  }

  async getContract(contractHash: string): Promise<TContractResponse> {
    try {
      const { data } = await this.#api.get<TBlockscoutBDSNeoXSmartContractApiResponse>(
        `/smart-contracts/${contractHash}`
      )

      if (!data || 'message' in data) {
        throw new Error('Contract not found')
      }

      const methods: TContractMethod[] = []

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
    } catch {
      throw new Error('Contract not found or not supported')
    }
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    const normalizedHash = this._service.tokenService.normalizeHash(tokenHash)
    const nativeAsset = BSNeoXConstants.NATIVE_ASSET

    if (nativeAsset.hash === normalizedHash) {
      return nativeAsset
    }

    const cachedToken = this._tokenCache.get(tokenHash)
    if (cachedToken) {
      return cachedToken
    }

    const { data } = await this.#api.get<TBlockscoutBDSNeoXTokensApiResponse>(`/tokens/${tokenHash}`)
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

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const { data: nativeBalance } = await this.#api.get<{ coin_balance: string }>(`/addresses/${address}`)
    if (!nativeBalance || 'message' in nativeBalance) {
      throw new Error('Native balance not found')
    }

    const nativeToken = BSNeoXConstants.NATIVE_ASSET

    const balances: TBalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance.coin_balance, nativeToken.decimals),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await this.#api.get<TBlockscoutBDSNeoXBalanceApiResponse[]>(
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

        const token: TBSToken = this._service.tokenService.normalizeToken({
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
    const { data } = await this.#api.get<TBlockscoutBDSNeoXBlocksApiResponse>('/blocks')
    if (!data || 'message' in data) {
      throw new Error('Block not found')
    }

    return data.items[0].height
  }

  #getBridgeNeo3NeoXDataByBlockscoutTransaction(
    transactionResponse: TBlockscoutBDSNeoXTransactionApiResponse
  ): TTransactionBridgeNeo3NeoX['data'] | undefined {
    const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)
    const input = BridgeInterface.parseTransaction({ data: transactionResponse.raw_input })

    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const to = input.args._to
    const receiverAddress = wallet.getAddressFromScriptHash(to.startsWith('0x') ? to.slice(2) : to)

    let token: TBridgeToken | undefined
    let amountBn: TBigNumber | undefined

    if (input.name === 'withdrawNative') {
      token = this._service.neo3NeoXBridgeService.gasToken
      amountBn = BSBigNumberHelper.fromDecimals(transactionResponse.value, token.decimals).minus(
        Neo3NeoXBridgeService.BRIDGE_FEE
      )
    } else if (input.name === 'withdrawToken') {
      token = this._service.neo3NeoXBridgeService.neoToken
      amountBn = BSBigNumberHelper.fromDecimals(input.args._amount.toString(), token.decimals)
    }

    if (!token || !amountBn) return undefined

    return {
      token,
      receiverAddress,
      amount: BSBigNumberHelper.toNumber(amountBn),
    }
  }
}
