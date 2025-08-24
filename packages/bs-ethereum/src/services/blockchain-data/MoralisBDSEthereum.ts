import {
  BalanceResponse,
  ContractMethod,
  ContractResponse,
  Token,
  TransactionResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  BSCommonConstants,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  ExportTransactionsByAddressParams,
  TNetwork,
  TNetworkId,
  BSFullTransactionsByAddressHelper,
  FullTransactionsItem,
  BSBigNumberHelper,
  BSPromisesHelper,
  NftResponse,
} from '@cityofzion/blockchain-service'
import axios from 'axios'
import { ethers } from 'ethers'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import { api } from '@cityofzion/dora-ts'
import {
  IBSEthereum,
  TBSEthereumNetworkId,
  TMoralisBDSEthereumERC20BalanceApiResponse,
  TMoralisBDSEthereumERC20MetadataApiResponse,
  TMoralisBDSEthereumNativeBalanceApiResponse,
  TMoralisBDSEthereumTransactionApiResponse,
  TMoralisTokenMetadataApiResponse,
  TMoralisWalletHistoryApiResponse,
} from '../../types'
import { RpcBDSEthereum } from './RpcBDSEthereum'

export class MoralisBDSEthereum<N extends string, A extends TNetworkId> extends RpcBDSEthereum<N, A> {
  static readonly BASE_URL = `${BSCommonConstants.DORA_URL}/api/v2/meta`
  static readonly FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS: TBSEthereumNetworkId[] = ['1', '42161', '8453', '137']
  static readonly FULL_TRANSACTIONS_ERC721_STANDARDS = ['erc721', 'erc-721']
  static readonly FULL_TRANSACTIONS_ERC1155_STANDARDS = ['erc1155', 'erc-1155']
  static readonly FULL_TRANSACTIONS_ERC20_STANDARDS = ['erc20', 'erc-20']
  // prettier-ignore
  static readonly MORALIS_SUPPORTED_NETWORKS_IDS: TBSEthereumNetworkId[] = [
    '1', '11155111', '17000', '137', '80002', '56', '97', '42161', '421614',
    '8453', '84532', '10', '11155420', '59144', '59141', '43114', '250',
    '4002', '25', '11297108109', '2020', '100', '10200', '88888', '88882',
    '369', '1284', '1285', '1287', '81457', '168587773', '324', '300',
    '5000', '5003', '1101', '2442', '7000', '7001'
  ]

  static getClient(network: TNetwork<TBSEthereumNetworkId>) {
    return axios.create({
      baseURL: MoralisBDSEthereum.BASE_URL,
      params: {
        chain: `0x${Number(network.id).toString(16)}`,
      },
    })
  }

  static isSupported(network: TNetwork<TBSEthereumNetworkId>) {
    return MoralisBDSEthereum.MORALIS_SUPPORTED_NETWORKS_IDS.includes(network.id)
  }

  constructor(service: IBSEthereum<N, A>) {
    super(service)
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getBalance(address)
    }

    const client = MoralisBDSEthereum.getClient(this._service.network)

    const {
      data: { balance: nativeBalance },
    } = await client.get<TMoralisBDSEthereumNativeBalanceApiResponse>(`${address}/balance`)

    const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)

    const balances: BalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance, nativeToken.decimals),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await client.get<TMoralisBDSEthereumERC20BalanceApiResponse[]>(`${address}/erc20`)

    erc20Balances.forEach(balance => {
      if (balance.possible_spam || !balance.decimals || !balance.token_address || !balance.symbol) return

      balances.push({
        amount: ethers.utils.formatUnits(balance.balance, balance.decimals),
        token: this._service.tokenService.normalizeToken({
          decimals: balance.decimals,
          hash: balance.token_address,
          name: balance.name ?? '',
          symbol: balance.symbol,
        }),
      })
    })

    return balances
  }

  async getTokenInfo(hash: string): Promise<Token> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTokenInfo(hash)
    }

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    if (this._service.tokenService.predicateByHash(nativeAsset, hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const client = MoralisBDSEthereum.getClient(this._service.network)
    const response = await client.get<TMoralisBDSEthereumERC20MetadataApiResponse[]>(`/erc20/metadata`, {
      params: {
        addresses: [hash],
      },
    })

    const data = response.data[0]

    const token = this._service.tokenService.normalizeToken({
      decimals: Number(data.decimals),
      symbol: data.symbol,
      hash,
      name: data.name,
    })

    this._tokenCache.set(hash, token)

    return token
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransaction(hash)
    }

    const client = MoralisBDSEthereum.getClient(this._service.network)

    const { data } = await client.get<TMoralisBDSEthereumTransactionApiResponse>(`/transaction/${hash}/verbose`)

    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    if (data.value && Number(data.value) > 0) {
      const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)

      transfers.push({
        amount: ethers.utils.formatUnits(data.value, nativeToken.decimals),
        from: data.from_address,
        to: data.to_address,
        type: 'token',
        token: nativeToken,
        contractHash: nativeToken.hash,
      })
    }

    if (data.logs) {
      const promises = data.logs.map(async log => {
        if (!log.decoded_event) return
        if (log.decoded_event.label.toLowerCase() !== 'transfer') return

        const contractHash = log.address
        const amount = log.decoded_event.params.find((param: any) => param.name === 'value')?.value
        const from = log.decoded_event.params.find((param: any) => param.name === 'from')?.value
        const to = log.decoded_event.params.find((param: any) => param.name === 'to')?.value
        if (!from || !to) return

        if (amount) {
          const token = await this.getTokenInfo(contractHash)

          transfers.push({
            contractHash,
            amount: ethers.utils.formatUnits(amount, token.decimals),
            from,
            to,
            type: 'token',
          })
        }

        const tokenHash = log.decoded_event.params.find((param: any) => param.name === 'tokenId')?.value
        if (!tokenHash) return

        transfers.push({
          collectionHash: contractHash,
          tokenHash,
          from,
          to,
          type: 'nft',
        })
      })

      await Promise.allSettled(promises)
    }

    return {
      block: Number(data.block_number),
      hash,
      notifications: [],
      time: new Date(data.block_timestamp).getTime() / 1000,
      transfers,
      fee: data.transaction_fee,
      type: 'default',
    }
  }

  async getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransactionsByAddress(params)
    }

    const client = MoralisBDSEthereum.getClient(this._service.network)

    const { data } = await client.get<TMoralisWalletHistoryApiResponse>(`/wallets/${params.address}/history`, {
      params: {
        limit: 15,
        cursor: params.nextPageParams,
      },
    })

    const transactions: TransactionResponse[] = []

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    const promises = data.result.map(async item => {
      const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

      item.native_transfers.forEach(transfer => {
        transfers.push({
          amount: ethers.utils.formatUnits(transfer.value, nativeAsset.decimals),
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'token',
          token: nativeAsset,
          contractHash: nativeAsset.hash,
        })
      })

      item.erc20_transfers.forEach(transfer => {
        if (transfer.possible_spam) return

        transfers.push({
          amount: ethers.utils.formatUnits(transfer.value, transfer.token_decimals),
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'token',
          token: this._service.tokenService.normalizeToken({
            decimals: Number(transfer.token_decimals),
            hash: transfer.address,
            name: transfer.token_name,
            symbol: transfer.token_symbol,
          }),
          contractHash: transfer.address,
        })
      })

      item.nft_transfers.forEach(transfer => {
        transfers.push({
          collectionHash: transfer.token_address,
          tokenHash: transfer.token_id,
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'nft',
        })
      })

      transactions.push({
        block: Number(item.block_number),
        hash: item.hash,
        notifications: [],
        time: new Date(item.block_timestamp).getTime() / 1000,
        transfers,
        fee: item.transaction_fee,
        type: 'default',
      })
    })

    await Promise.allSettled(promises)

    return {
      nextPageParams: data.cursor,
      transactions,
    }
  }

  async getFullTransactionsByAddress({
    nextCursor,
    ...params
  }: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this._service,
      supportedNetworksIds: MoralisBDSEthereum.FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    const data: FullTransactionsItem[] = []

    const response = await api.EthereumREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._service.network.id,
      cursor: nextCursor,
      pageLimit: params.pageSize ?? 50,
    })

    const items = response.data ?? []

    const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)

    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this._service.explorerService.getNftTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const newItem: FullTransactionsItem = {
        txId,
        txIdUrl: txId ? txTemplateUrl?.replace('{txId}', txId) : undefined,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? BSBigNumberHelper.format(networkFeeAmount, { decimals: nativeToken.decimals })
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? BSBigNumberHelper.format(systemFeeAmount, { decimals: nativeToken.decimals })
          : undefined,
        events: [],
        type: 'default',
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash } = event
        const from = event.from ?? undefined
        const to = event.to ?? undefined
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isErc1155 = MoralisBDSEthereum.FULL_TRANSACTIONS_ERC1155_STANDARDS.includes(standard)
        const isErc721 = MoralisBDSEthereum.FULL_TRANSACTIONS_ERC721_STANDARDS.includes(standard)
        const isErc20 = MoralisBDSEthereum.FULL_TRANSACTIONS_ERC20_STANDARDS.includes(standard)
        const isNft = (isErc1155 || isErc721) && !!tokenHash
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
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
      supportedNetworksIds: MoralisBDSEthereum.FULL_TRANSACTIONS_SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    return await api.EthereumREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._service.network.id,
    })
  }

  async getContract(hash: string): Promise<ContractResponse> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getContract(hash)
    }

    try {
      const client = MoralisBDSEthereum.getClient(this._service.network)

      const { data } = await client.get<TMoralisTokenMetadataApiResponse[]>(`erc20/metadata`, {
        params: {
          addresses: [hash],
        },
      })

      const methods: ContractMethod[] = []

      ERC20_ABI.forEach(abi => {
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
        hash,
        name: data[0].name,
        methods,
      }
    } catch {
      throw new Error('Contract not found or not an ERC20 token')
    }
  }
}
