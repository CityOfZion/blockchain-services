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
import type { IBSNeo3, TBSNeo3NetworkId } from '../../types'
import { DoraBDSNeo3 } from '../blockchain-data/DoraBDSNeo3'
import type { api } from '@cityofzion/dora-ts'
import type { Notification } from '@cityofzion/dora-ts/dist/interfaces/api/neo'

export class DoraFullTransactionsDataServiceNeo3<N extends string> implements IFullTransactionsDataService<N> {
  static readonly SUPPORTED_NEP11_STANDARDS: string[] = ['nep11', 'nep-11']
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeo3NetworkId[] = ['mainnet', 'testnet']

  readonly #service: IBSNeo3<N>

  #apiInstance?: api.NeoRESTApi

  constructor(service: IBSNeo3<N>) {
    this.#service = service
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = DoraBDSNeo3.getClient()
    }

    return this.#apiInstance
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      service: this.#service,
      supportedNetworksIds: DoraFullTransactionsDataServiceNeo3.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    const response = await this.#api.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.id as 'mainnet' | 'testnet',
      cursor: nextPageParams,
      pageLimit: params.pageSize ?? 50,
    })

    const items = response.data ?? []
    const transactions: TTransaction<N>[] = []

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this.#service.explorerService.getNftTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = txTemplateUrl?.replace('{txId}', txId)

      let newItem: TTransaction<N> = {
        txId,
        txIdUrl,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? BSBigNumberHelper.format(networkFeeAmount, { decimals: this.#service.feeToken.decimals })
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? BSBigNumberHelper.format(systemFeeAmount, { decimals: this.#service.feeToken.decimals })
          : undefined,
        events: [],
        type: 'default',
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash, contractName } = event
        const from = event.from ?? undefined
        const to = event.to ?? undefined
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNft = DoraFullTransactionsDataServiceNeo3.SUPPORTED_NEP11_STANDARDS.includes(standard) && !!tokenHash

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
            tokenType: 'nep-11',
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
          tokenType: 'nep-17',
        })

        if (newItem.type === 'default' && contractName === 'NeoXBridge') {
          const [log] = await BSUtilsHelper.tryCatch(() => this.#api.log(txId, this.#service.network.id))

          if (!!log && log.vmstate === 'HALT') {
            const notifications = log.notifications as unknown as Notification[]
            const data = DoraBDSNeo3.getBridgeNeo3NeoXDataByNotifications(notifications ?? [], this.#service)
            if (data) newItem = { ...newItem, type: 'bridgeNeo3NeoX', data }
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
      supportedNetworksIds: DoraFullTransactionsDataServiceNeo3.SUPPORTED_NETWORKS_IDS,
      ...params,
    })

    return await this.#api.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this.#service.network.id as 'mainnet' | 'testnet',
    })
  }
}
