import {
  BSBigNumberHelper,
  BSCommonConstants,
  BSUtilsHelper,
  type TBalanceResponse,
  type TContractMethod,
  type TBSNetwork,
  type TBSToken,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TContractResponse,
  type TTransactionDefault,
  type TTransactionDefaultEvent,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { ethers } from 'ethers'
import { BSEthereumConstants, ERC20_ABI, RpcBDSEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import type {
  IBSNeoX,
  TBlockscoutBDSNeoXBalanceApiResponse,
  TBlockscoutBDSNeoXBlocksApiResponse,
  TBlockscoutBDSNeoXSmartContractApiResponse,
  TBlockscoutBDSNeoXTokensApiResponse,
  TBlockscoutBDSNeoXTransactionApiResponse,
  TBlockscoutBDSNeoXTransactionByAddressApiResponse,
  TBSNeoXName,
  TBSNeoXNetworkId,
} from '../../types'

export class BlockscoutBDSNeoX extends RpcBDSEthereum<TBSNeoXName, TBSNeoXNetworkId, IBSNeoX> {
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

  constructor(service: IBSNeoX) {
    super(service)
  }

  get #api() {
    if (!this.#apiInstance) {
      return BlockscoutBDSNeoX.getClient(this._service.network)
    }

    return this.#apiInstance
  }

  async getTransaction(txid: string): Promise<TTransactionDefault<TBSNeoXName>> {
    const { data: response } = await this.#api.get<TBlockscoutBDSNeoXTransactionApiResponse>(`/transactions/${txid}`)

    if (!response || 'message' in response) {
      throw new Error('Transaction not found')
    }

    const nativeToken = BSNeoXConstants.NATIVE_ASSET
    const events: TTransactionDefaultEvent[] = []

    const hasNativeTokenBeingTransferred = response.value !== '0'
    if (hasNativeTokenBeingTransferred) {
      const from = response.from.hash
      const to = response.to.hash
      const fromUrl = this._service.explorerService.buildAddressUrl(from)
      const toUrl = this._service.explorerService.buildAddressUrl(to)

      events.splice(0, 0, {
        eventType: 'token',
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(response.value, nativeToken.decimals), {
          decimals: nativeToken.decimals,
        }),
        methodName: 'transfer',
        from,
        fromUrl,
        to,
        toUrl,
        tokenUrl: this._service.explorerService.buildContractUrl(nativeToken.hash),
        token: nativeToken,
      })
    }

    const hasTokenTransfers = response.token_transfers && response.token_transfers.length > 0
    if (hasTokenTransfers) {
      const promises = response.token_transfers.map(async (tokenTransfer, currentIndex) => {
        const index = hasNativeTokenBeingTransferred ? currentIndex + 1 : currentIndex
        const contractHash = tokenTransfer.token.address
        const from = tokenTransfer.from.hash
        const to = tokenTransfer.to.hash
        const fromUrl = this._service.explorerService.buildAddressUrl(from)
        const toUrl = this._service.explorerService.buildAddressUrl(to)

        if (tokenTransfer.token.type === 'ERC-20') {
          const token = this._service.tokenService.normalizeToken({
            symbol: tokenTransfer.token.symbol,
            name: tokenTransfer.token.name,
            hash: contractHash,
            decimals: Number(tokenTransfer.total.decimals),
          })

          events.splice(index, 0, {
            eventType: 'token',
            amount: BSBigNumberHelper.format(
              BSBigNumberHelper.fromDecimals(tokenTransfer.total.value, tokenTransfer.total.decimals),
              {
                decimals: tokenTransfer.total.decimals,
              }
            ),
            methodName: 'transfer',
            from,
            fromUrl,
            to,
            toUrl,
            tokenUrl: this._service.explorerService.buildContractUrl(token.hash),
            token,
          })

          return
        }

        if (tokenTransfer.token.type === 'ERC-721') {
          const tokenHash = tokenTransfer.total.token_id

          const [nft] = await BSUtilsHelper.tryCatch(() =>
            this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
          )

          events.splice(index, 0, {
            eventType: 'nft',
            amount: '1',
            methodName: 'transfer',
            from,
            fromUrl,
            to,
            toUrl,
            nft,
          })
        }
      })

      await Promise.allSettled(promises)
    }

    const data = this._service.neo3NeoXBridgeService._getDataFromBlockscoutTransaction(response)

    const txId = response.hash

    const transaction: TTransactionDefault<TBSNeoXName> = {
      blockchain: this._service.name,
      isPending: false,
      txId,
      txIdUrl: this._service.explorerService.buildTransactionUrl(txId),
      block: response.block,
      date: new Date(response.timestamp).toJSON(),
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(response.fee.value, this._service.feeToken.decimals),
        {
          decimals: this._service.feeToken.decimals,
        }
      ),
      view: 'default',
      events,
      data,
    }

    return transaction
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<TBSNeoXName, TTransactionDefault<TBSNeoXName>>> {
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
    const transactions: TTransactionDefault<TBSNeoXName>[] = []

    const promises = data.items.map(async (item, index) => {
      const events: TTransactionDefaultEvent[] = []
      const hasNativeTokenBeingTransferred = item.value !== '0'

      if (hasNativeTokenBeingTransferred) {
        const from = item.from.hash
        const to = item.to?.hash
        const fromUrl = this._service.explorerService.buildAddressUrl(from)
        const toUrl = this._service.explorerService.buildAddressUrl(to)

        events.push({
          eventType: 'token',
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(item.value, nativeToken.decimals), {
            decimals: nativeToken.decimals,
          }),
          methodName: 'transfer',
          from,
          fromUrl,
          to,
          toUrl,
          tokenUrl: this._service.explorerService.buildContractUrl(nativeToken.hash),
          token: nativeToken,
        })
      }

      const rawInput = item.raw_input

      if (rawInput) {
        try {
          const ERC20Interface = new ethers.utils.Interface(ERC20_ABI)
          const result = ERC20Interface.decodeFunctionData('transfer', rawInput)

          if (!result) throw new Error('Invalid ERC20 transfer')

          const contractHash = item.to.hash
          const token = await this.getTokenInfo(contractHash)
          const from = item.from.hash
          const fromUrl = this._service.explorerService.buildAddressUrl(from)
          const to = result[0]
          const toUrl = this._service.explorerService.buildAddressUrl(to)
          const value = result[1]

          events.push({
            eventType: 'token',
            amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(value, token.decimals), {
              decimals: token.decimals,
            }),
            methodName: 'transfer',
            from,
            fromUrl,
            to,
            toUrl,
            tokenUrl: this._service.explorerService.buildContractUrl(token.hash),
            token,
          })
        } catch {
          /* empty */
        }
      }

      if (events.length === 0) {
        return
      }

      const data = this._service.neo3NeoXBridgeService._getDataFromBlockscoutTransaction(item)

      const txId = item.hash

      const transaction: TTransactionDefault<TBSNeoXName> = {
        blockchain: this._service.name,
        isPending: false,
        txId,
        txIdUrl: this._service.explorerService.buildTransactionUrl(txId),
        block: item.block,
        date: new Date(item.timestamp).toJSON(),
        networkFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(item.fee.value, this._service.feeToken.decimals),
          {
            decimals: this._service.feeToken.decimals,
          }
        ),
        view: 'default',
        events,
        data,
      }

      transactions.splice(index, 0, transaction)
    })

    await Promise.allSettled(promises)

    return { transactions, nextPageParams: data.next_page_params }
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
        amount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(nativeBalance.coin_balance, nativeToken.decimals),
          {
            decimals: nativeToken.decimals,
          }
        ),
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
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(balance.value, token.decimals), {
            decimals: token.decimals,
          }),
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
}
