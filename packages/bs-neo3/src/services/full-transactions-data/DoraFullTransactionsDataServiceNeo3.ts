import {
  BSBigHumanAmount,
  BSFullTransactionsByAddressHelper,
  BSUtilsHelper,
  type IFullTransactionsDataService,
  type TExportFullTransactionsByAddressParams,
  type TGetFullTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TNeo3NeoXBridgeTransactionData,
  type TTransactionDefault,
  type TTransactionDefaultEvent,
} from '@cityofzion/blockchain-service'
import type { IBSNeo3, TBSNeo3Name, TBSNeo3NetworkId } from '../../types'
import { DoraBDSNeo3 } from '../blockchain-data/DoraBDSNeo3'
import type { api } from '@cityofzion/dora-ts'

export class DoraFullTransactionsDataServiceNeo3 implements IFullTransactionsDataService<TBSNeo3Name> {
  static readonly SUPPORTED_NEP11_STANDARDS: string[] = ['nep11', 'nep-11']
  static readonly SUPPORTED_NETWORKS_IDS: TBSNeo3NetworkId[] = ['mainnet', 'testnet']

  readonly #service: IBSNeo3

  #apiInstance?: api.NeoRESTApi

  constructor(service: IBSNeo3) {
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
  }: TGetFullTransactionsByAddressParams): Promise<
    TGetTransactionsByAddressResponse<TBSNeo3Name, TTransactionDefault<TBSNeo3Name>>
  > {
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
    const transactions: TTransactionDefault<TBSNeo3Name>[] = []

    const itemPromises = items.map(async ({ networkFeeAmount, ...item }, index) => {
      const txId = item.transactionID
      const txIdUrl = this.#service.explorerService.buildTransactionUrl(txId)

      const events: TTransactionDefaultEvent[] = []

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash } = event
        const from = event.from || undefined
        const to = event.to || undefined
        const fromUrl = from ? this.#service.explorerService.buildAddressUrl(from) : undefined
        const toUrl = to ? this.#service.explorerService.buildAddressUrl(to) : undefined
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNft = DoraFullTransactionsDataServiceNeo3.SUPPORTED_NEP11_STANDARDS.includes(standard) && !!tokenHash

        if (isNft) {
          const [nft] = await BSUtilsHelper.tryCatch(() =>
            this.#service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
          )

          events.splice(eventIndex, 0, {
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

        events.splice(eventIndex, 0, {
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
      })

      await Promise.allSettled(eventPromises)

      const itemData = 'data' in item ? (item.data as any) : undefined

      let data = {
        ...this.#service.claimService._getTransactionDataFromEvents(events),
        ...this.#service.voteService._getTransactionDataFromEvents(events),
      }

      const bridgeData = itemData?.bridgeData as Record<string, any> | undefined

      if (bridgeData) {
        const bridgeService = this.#service.neo3NeoXBridgeService
        const tokenService = this.#service.tokenService

        const tokenToUse = !bridgeData.neo3TokenHash
          ? bridgeService.gasToken
          : bridgeService.tokens.find(token => tokenService.predicateByHash(bridgeData.neo3TokenHash, token))

        if (tokenToUse) {
          const newBridgeData: TNeo3NeoXBridgeTransactionData<TBSNeo3Name> = {
            neo3NeoxBridge: {
              amount: new BSBigHumanAmount(bridgeData.amount, tokenToUse.decimals).toFormatted(),
              tokenToUse,
              multichainIdToReceive: tokenToUse.multichainId,
              receiverAddress: bridgeData.receiverAddress,
            },
          }

          data = {
            ...data,
            ...newBridgeData,
          }
        }
      }

      const newItem: TTransactionDefault<TBSNeo3Name> = {
        blockchain: this.#service.name,
        isPending: false,
        relatedAddress: params.address,
        txId,
        txIdUrl,
        block: item.block,
        date: item.date,
        invocationCount: itemData?.invocationCount,
        notificationCount: itemData?.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? new BSBigHumanAmount(networkFeeAmount, this.#service.feeToken.decimals).toFormatted()
          : undefined,
        systemFeeAmount: itemData?.systemFeeAmount
          ? new BSBigHumanAmount(itemData.systemFeeAmount, this.#service.feeToken.decimals).toFormatted()
          : undefined,
        view: 'default',
        events,
        data,
      }

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
