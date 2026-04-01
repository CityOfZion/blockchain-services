import {
  BSBigHumanAmount,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionDefault,
} from '@cityofzion/blockchain-service'
import type { IBSNeoX, TBSNeoXNetworkId } from '../../types'
import { api } from '@cityofzion/dora-ts'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'

export class BlockscoutFullTransactionsDataService implements IFullTransactionsDataService {
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeoXNetworkId[] = ['47763', '12227332']
  static readonly ERC721_STANDARDS = ['erc721', 'erc-721']
  static readonly ERC1155_STANDARDS = ['erc1155', 'erc-1155']

  #service: IBSNeoX

  constructor(service: IBSNeoX) {
    this.#service = service
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<TTransactionDefault>> {
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

    const transactions: TTransactionDefault[] = []
    const items = response.data ?? []

    const itemPromises = items.map(async ({ networkFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = this.#service.explorerService.buildTransactionUrl(txId)

      let newItem: TTransactionDefault = {
        txId,
        txIdUrl,
        block: item.block,
        date: item.date,
        networkFeeAmount: networkFeeAmount
          ? new BSBigHumanAmount(networkFeeAmount, BSNeoXConstants.NATIVE_ASSET.decimals).toFormatted()
          : undefined,
        view: 'default',
        events: [],
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash } = event

        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isErc1155 = BlockscoutFullTransactionsDataService.ERC1155_STANDARDS.includes(standard)
        const isErc721 = BlockscoutFullTransactionsDataService.ERC721_STANDARDS.includes(standard)
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
            amount: '1',
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            nft,
          })

          return
        }

        const [token] = await BSUtilsHelper.tryCatch(() =>
          this.#service.blockchainDataService.getTokenInfo(contractHash)
        )

        newItem.events.splice(eventIndex, 0, {
          eventType: 'token',
          amount: event.amount
            ? new BSBigHumanAmount(event.amount, token?.decimals ?? event.tokenDecimals).toFormatted()
            : undefined,
          methodName,
          from,
          fromUrl,
          to,
          toUrl,
          tokenUrl: token ? this.#service.explorerService.buildContractUrl(token.hash) : undefined,
          token,
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
            data: {
              neo3NeoxBridge: {
                amount: new BSBigHumanAmount(bridgeData.amount, tokenToUse.decimals).toFormatted(),
                tokenToUse,
                receiverAddress: bridgeData.receiverBridgeAddress,
              },
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
