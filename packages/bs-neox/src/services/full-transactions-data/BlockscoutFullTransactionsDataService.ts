import {
  BSBigNumberHelper,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
} from '@cityofzion/blockchain-service'
import type { IBSNeoX, TBSNeoXNetworkId } from '../../types'
import { api } from '@cityofzion/dora-ts'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'

export class BlockscoutFullTransactionsDataService<N extends string> implements IFullTransactionsDataService<N> {
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeoXNetworkId[] = ['47763', '12227332']
  static readonly ERC721_STANDARDS = ['erc721', 'erc-721']
  static readonly ERC1155_STANDARDS = ['erc1155', 'erc-1155']
  static readonly ERC20_STANDARDS = ['erc20', 'erc-20']

  #service: IBSNeoX<N>

  constructor(service: IBSNeoX<N>) {
    this.#service = service
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this.#service,
      supportedNetworksIds: BlockscoutFullTransactionsDataService.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    const response = await api.NeoXREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.type as 'mainnet' | 'testnet',
      cursor: nextPageParams,
      pageLimit: params.pageSize ?? 50,
    })

    const transactions: TTransaction<N>[] = []
    const items = response.data ?? []

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = this.#service.explorerService.buildTransactionUrl(txId)

      let newItem: TTransaction<N> = {
        txId,
        txIdUrl,
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
        const isErc1155 = BlockscoutFullTransactionsDataService.ERC1155_STANDARDS.includes(standard)
        const isErc721 = BlockscoutFullTransactionsDataService.ERC721_STANDARDS.includes(standard)
        const isErc20 = BlockscoutFullTransactionsDataService.ERC20_STANDARDS.includes(standard)
        const isNft = (isErc1155 || isErc721) && !!tokenHash

        const from = event.from ?? undefined
        const fromUrl = from ? this.#service.explorerService.buildAddressUrl(from) : undefined

        const to = event.to ?? undefined
        const toUrl = to ? this.#service.explorerService.buildAddressUrl(to) : undefined

        if (isNft) {
          const [nft] = await BSUtilsHelper.tryCatch(() =>
            this.#service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
          )

          newItem.events.splice(eventIndex, 0, {
            eventType: 'nft',
            amount: undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            collectionHash: contractHash,
            collectionHashUrl: nft?.collection?.url,
            tokenHash,
            tokenType: isErc1155 ? 'erc-1155' : 'erc-721',
            nftImageUrl: nft?.image,
            nftUrl: nft?.explorerUri,
            name: nft?.name,
            collectionName: nft?.collection?.name,
          })

          return
        }

        const [token] = await BSUtilsHelper.tryCatch(() =>
          this.#service.blockchainDataService.getTokenInfo(contractHash)
        )

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
          contractHashUrl: this.#service.explorerService.buildContractUrl(contractHash),
          token: token ?? undefined,
          tokenType: isErc20 ? 'erc-20' : 'generic',
        })

        const eventData = 'data' in item ? (item.data as any) : undefined
        const bridgeData = eventData?.bridgeData

        if (bridgeData) {
          const tokenToUse =
            bridgeData.method === 'withdrawNative'
              ? this.#service.neo3NeoXBridgeService.gasToken
              : this.#service.neo3NeoXBridgeService.neoToken

          newItem = {
            ...newItem,
            type: 'bridgeNeo3NeoX',
            data: {
              amount: BSBigNumberHelper.format(bridgeData.amount, { decimals: tokenToUse.decimals }),
              tokenToUse,
              receiverAddress: bridgeData.receiverBridgeAddress,
            },
          }
        }
      })

      await Promise.allSettled(eventPromises)

      transactions.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextPageParams: response.nextCursor, transactions }
  }

  async exportFullTransactionsByAddress(params: TExportFullTransactionsByAddressParams): Promise<string> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this.#service,
      supportedNetworksIds: BlockscoutFullTransactionsDataService.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    return await api.NeoXREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.type as 'mainnet' | 'testnet',
    })
  }
}
