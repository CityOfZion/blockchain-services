import { RpcBDSEthereum } from './RpcBDSEthereum'
import {
  BSBigNumberHelper,
  BSFullTransactionsByAddressHelper,
  BSPromisesHelper,
  ExplorerService,
  FullTransactionAssetEvent,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  Network,
  NetworkId,
  NftDataService,
  NftResponse,
  Token,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { GetFullTransactionsByAddressResponse } from '@cityofzion/dora-ts/dist/interfaces/api/common'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { BSEthereumNetworkId } from '../../constants/BSEthereumConstants'

export class DoraBDSEthereum<BSNetworkId extends NetworkId = BSEthereumNetworkId> extends RpcBDSEthereum {
  readonly #supportedErc721Standards = ['erc721', 'erc-721']
  readonly #supportedErc1155Standards = ['erc1155', 'erc-1155']
  readonly #supportedErc20Standards = ['erc20', 'erc-20']
  readonly #supportedFullTransactionsByAddressNetworks: BSNetworkId[]
  readonly #nftDataService: NftDataService
  readonly #explorerService: ExplorerService

  constructor(
    network: Network<BSNetworkId>,
    supportedFullTransactionsByAddressNetworks: BSNetworkId[],
    nftDataService: NftDataService,
    explorerService: ExplorerService
  ) {
    super(network)

    this.#supportedFullTransactionsByAddressNetworks = supportedFullTransactionsByAddressNetworks
    this.#nftDataService = nftDataService
    this.#explorerService = explorerService
  }

  async _transformFullTransactionsByAddressResponse({
    nextCursor,
    ...response
  }: GetFullTransactionsByAddressResponse): Promise<FullTransactionsByAddressResponse> {
    const data: FullTransactionsItem[] = []
    const items = response.data ?? []

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const addressTemplateUrl = this.#explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this.#explorerService.getNftTemplateUrl()
    const contractTemplateUrl = this.#explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }) => {
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
      }

      const eventPromises = item.events.map(async event => {
        let nftEvent: FullTransactionNftEvent
        let assetEvent: FullTransactionAssetEvent

        const { methodName, tokenID: tokenId, contractHash: hash } = event
        const from = event.from ?? undefined
        const to = event.to ?? undefined
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isErc1155 = this.#supportedErc1155Standards.includes(standard)
        const isErc721 = this.#supportedErc721Standards.includes(standard)
        const isErc20 = this.#supportedErc20Standards.includes(standard)
        const isNft = (isErc1155 || isErc721) && !!tokenId
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const hashUrl = hash ? contractTemplateUrl?.replace('{hash}', hash) : undefined

        if (isNft) {
          const [nft] = await BSPromisesHelper.tryCatch<NftResponse>(() =>
            this.#nftDataService.getNft({ contractHash: hash, tokenId })
          )

          const nftUrl = hash ? nftTemplateUrl?.replace('{hash}', hash).replace('{tokenId}', tokenId) : undefined

          nftEvent = {
            eventType: 'nft',
            amount: undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            hash,
            hashUrl,
            tokenId,
            tokenType: isErc1155 ? 'erc-1155' : 'erc-721',
            nftImageUrl: nft?.image,
            nftUrl,
            name: nft?.name,
            collectionName: nft?.collectionName,
          }
        } else {
          const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(hash))

          assetEvent = {
            eventType: 'token',
            amount: event.amount
              ? BSBigNumberHelper.format(event.amount, { decimals: token?.decimals ?? event.tokenDecimals })
              : undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            hash,
            hashUrl,
            token: token ?? undefined,
            tokenType: isErc20 ? 'erc-20' : 'generic',
          }
        }

        newItem.events.push(isNft ? nftEvent! : assetEvent!)
      })

      await Promise.allSettled(eventPromises)

      data.push(newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor, data }
  }

  _validateFullTransactionsByAddressParams(
    params: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo'>
  ) {
    if (!this.#supportedFullTransactionsByAddressNetworks.includes(this._network.id as BSNetworkId))
      throw new Error('This network is not supported')

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams(params)

    if (!ethers.utils.isAddress(params.address)) throw new Error('Invalid address param')
  }

  _validateGetFullTransactionsByAddressParams({
    pageSize,
    ...params
  }: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo' | 'pageSize'>) {
    if (typeof pageSize === 'number' && (isNaN(pageSize) || pageSize < 1 || pageSize > 500))
      throw new Error('Page size should be between 1 and 500')

    this._validateFullTransactionsByAddressParams(params)
  }
}
