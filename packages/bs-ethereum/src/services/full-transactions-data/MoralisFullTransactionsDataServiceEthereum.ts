import {
  BSBigNumberHelper,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TBSNetworkId,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
} from '@cityofzion/blockchain-service'
import type { IBSEthereum, TBSEthereumNetworkId } from '../../types'
import { api } from '@cityofzion/dora-ts'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'

export class MoralisFullTransactionsDataServiceEthereum<N extends string, A extends TBSNetworkId>
  implements IFullTransactionsDataService<N>
{
  static readonly SUPPORTED_NETWORKS_IDS: TBSEthereumNetworkId[] = ['1', '42161', '8453', '137']
  static readonly ERC721_STANDARDS = ['erc721', 'erc-721']
  static readonly ERC1155_STANDARDS = ['erc1155', 'erc-1155']
  static readonly ERC20_STANDARDS = ['erc20', 'erc-20']

  readonly #service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    this.#service = service
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this.#service,
      supportedNetworksIds: MoralisFullTransactionsDataServiceEthereum.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    const transactions: TTransaction<N>[] = []

    const response = await api.EthereumREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.id,
      cursor: nextPageParams,
      pageLimit: params.pageSize ?? 50,
    })

    const items = response.data ?? []

    const nativeToken = BSEthereumHelper.getNativeAsset(this.#service.network)

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this.#service.explorerService.getNftTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID

      const newItem: TTransaction<N> = {
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
        const isErc1155 = MoralisFullTransactionsDataServiceEthereum.ERC1155_STANDARDS.includes(standard)
        const isErc721 = MoralisFullTransactionsDataServiceEthereum.ERC721_STANDARDS.includes(standard)
        const isErc20 = MoralisFullTransactionsDataServiceEthereum.ERC20_STANDARDS.includes(standard)
        const isNft = (isErc1155 || isErc721) && !!tokenHash
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined

        if (isNft) {
          const [nft] = await BSUtilsHelper.tryCatch(() =>
            this.#service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
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
          contractHashUrl,
          token: token ?? undefined,
          tokenType: isErc20 ? 'erc-20' : 'generic',
        })
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
      supportedNetworksIds: MoralisFullTransactionsDataServiceEthereum.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    return await api.EthereumREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.id,
    })
  }
}
