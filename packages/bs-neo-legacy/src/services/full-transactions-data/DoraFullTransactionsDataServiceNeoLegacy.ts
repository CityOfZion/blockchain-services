import {
  BSBigNumberHelper,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
  type TTransactionTokenEvent,
} from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy, TBSNeoLegacyNetworkId } from '../../types'
import { api } from '@cityofzion/dora-ts'

export class DoraFullTransactionsDataServiceNeoLegacy<N extends string> implements IFullTransactionsDataService {
  static readonly SUPPORTED_NEP5_STANDARDS: string[] = ['nep5', 'nep-5']
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeoLegacyNetworkId[] = ['mainnet']
  static readonly MAX_PAGE_SIZE = 30

  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      ...params,
      service: this.#service,
      supportedNetworksIds: DoraFullTransactionsDataServiceNeoLegacy.SUPPORTED_NETWORKS_IDS,
      maxPageSize: DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE,
    })

    const data: TTransaction[] = []

    const response = await api.NeoLegacyREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
      cursor: nextPageParams,
      pageLimit: params.pageSize ?? DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE,
    })

    const items = response.data ?? []

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = txTemplateUrl?.replace('{txId}', txId)
      const newItem: TTransaction = {
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
        const { contractHash, amount, from, to } = event

        const [token] = await BSUtilsHelper.tryCatch(() =>
          this.#service.blockchainDataService.getTokenInfo(contractHash)
        )

        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNep5 = DoraFullTransactionsDataServiceNeoLegacy.SUPPORTED_NEP5_STANDARDS.includes(standard)
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined

        const assetEvent: TTransactionTokenEvent = {
          eventType: 'token',
          amount: amount
            ? BSBigNumberHelper.format(amount, { decimals: token?.decimals ?? event.tokenDecimals })
            : undefined,
          methodName: event.methodName,
          from: from ?? undefined,
          fromUrl,
          to: to ?? undefined,
          toUrl,
          contractHash,
          contractHashUrl,
          token: token ?? undefined,
          tokenType: isNep5 ? 'nep-5' : 'generic',
        }

        newItem.events.splice(eventIndex, 0, assetEvent)
      })

      await Promise.allSettled(eventPromises)

      data.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextPageParams: response.nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: TExportFullTransactionsByAddressParams): Promise<string> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      ...params,
      service: this.#service,
      supportedNetworksIds: DoraFullTransactionsDataServiceNeoLegacy.SUPPORTED_NETWORKS_IDS,
      maxPageSize: DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE,
    })

    return await api.NeoLegacyREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
    })
  }
}
