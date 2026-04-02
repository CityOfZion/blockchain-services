import {
  BSBigHumanAmount,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionDefault,
  type TTransactionDefaultTokenEvent,
} from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy, TBSNeoLegacyNetworkId } from '../../types'
import { api } from '@cityofzion/dora-ts'

export class DoraFullTransactionsDataServiceNeoLegacy implements IFullTransactionsDataService {
  static readonly SUPPORTED_NEP5_STANDARDS: string[] = ['nep5', 'nep-5']
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeoLegacyNetworkId[] = ['mainnet']
  static readonly MAX_PAGE_SIZE = 30

  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    this.#service = service
  }

  async getFullTransactionsByAddress({
    nextPageParams,
    ...params
  }: TGetFullTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<TTransactionDefault>> {
    const pageSize =
      params.pageSize && params.pageSize > DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE
        ? DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE
        : params.pageSize

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      ...params,
      service: this.#service,
      supportedNetworksIds: DoraFullTransactionsDataServiceNeoLegacy.SUPPORTED_NETWORKS_IDS,
      maxPageSize: DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE,
      pageSize,
    })

    const transactions: TTransactionDefault[] = []

    const response = await api.NeoLegacyREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
      cursor: nextPageParams,
      pageLimit: params.pageSize ?? DoraFullTransactionsDataServiceNeoLegacy.MAX_PAGE_SIZE,
    })

    const items = response.data ?? []

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = this.#service.explorerService.buildTransactionUrl(txId)

      const newItem: TTransactionDefault = {
        txId,
        txIdUrl,
        block: item.block,
        date: item.date,
        networkFeeAmount: networkFeeAmount
          ? new BSBigHumanAmount(networkFeeAmount, this.#service.feeToken.decimals).toFormatted()
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? new BSBigHumanAmount(systemFeeAmount, this.#service.feeToken.decimals).toFormatted()
          : undefined,
        view: 'default',
        events: [],
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { contractHash, amount, from, to } = event

        const [token] = await BSUtilsHelper.tryCatch(() =>
          this.#service.blockchainDataService.getTokenInfo(contractHash)
        )

        const fromUrl = from ? this.#service.explorerService.buildAddressUrl(from) : undefined
        const toUrl = to ? this.#service.explorerService.buildAddressUrl(to) : undefined

        const assetEvent: TTransactionDefaultTokenEvent = {
          eventType: 'token',
          amount: amount
            ? new BSBigHumanAmount(amount, token?.decimals ?? event.tokenDecimals).toFormatted()
            : undefined,
          methodName: event.methodName,
          from: from ?? undefined,
          fromUrl,
          to: to ?? undefined,
          toUrl,
          tokenUrl: token ? this.#service.explorerService.buildContractUrl(token.hash) : undefined,
          token,
        }

        newItem.events.splice(eventIndex, 0, assetEvent)
      })

      await Promise.allSettled(eventPromises)

      transactions.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextPageParams: response.nextCursor, transactions }
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
