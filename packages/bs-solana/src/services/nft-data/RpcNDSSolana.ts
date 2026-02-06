import {
  TGetNftParam,
  TGetNftsByAddressParams,
  THasTokenParam,
  INftDataService,
  TNftResponse,
  TNftsResponse,
} from '@cityofzion/blockchain-service'
import { IBSSolana, type TMetaplexAssetByOwnerResponse, type TMetaplexAssetResponse } from '../../types'
import axios from 'axios'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'

export class RpcNDSSolana<N extends string> implements INftDataService {
  static readonly SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif']

  #service: IBSSolana<N>

  #nftsCache: Map<string, TNftResponse> = new Map()

  #rpcUrl: string

  constructor(service: IBSSolana<N>) {
    this.#service = service
    this.#rpcUrl = BSSolanaConstants.PUBLIC_RPC_LIST_BY_NETWORK_ID[service.network.id]
  }

  async #parseResponse(result: TMetaplexAssetResponse['result']) {
    if (result?.interface !== 'V1_NFT' && result.interface !== 'ProgrammableNFT') {
      return undefined
    }

    let collection: TNftResponse['collection'] | undefined

    const group = result.grouping.find(g => g.group_key === 'collection')
    if (group) {
      collection = {
        hash: group.group_value,
        name: group.collection_metadata?.name,
        image: group.collection_metadata?.image,
      }
    }

    let creator: TNftResponse['creator'] | undefined
    if (result.creators.length > 0) {
      creator = {
        address: result.creators[0].address,
      }
    }

    let image: string | undefined
    if (result.content.files && result.content.files.length > 0) {
      const imageFile = result.content.files.find(file => RpcNDSSolana.SUPPORTED_MIME_TYPES.includes(file.mime))

      image = imageFile?.uri
    }

    const nftTemplateUrl = this.#service.explorerService.getNftTemplateUrl()

    const nft: TNftResponse = {
      hash: result.id,
      explorerUri: nftTemplateUrl?.replace('{tokenHash}', result.id),
      collection,
      creator,
      symbol: result.content.metadata.symbol,
      image,
      name: result.content.metadata.name,
    }

    return nft
  }

  async getNft(params: TGetNftParam): Promise<TNftResponse> {
    const nftFromCache = this.#nftsCache.get(params.tokenHash)
    if (nftFromCache) {
      return nftFromCache
    }

    const response = await axios.post<TMetaplexAssetResponse>(this.#rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAsset',
      params: {
        id: params.tokenHash,
        options: {
          showCollectionMetadata: true,
          showUnverifiedCollections: true,
        },
      },
    })

    const result = response.data.result
    const nft = await this.#parseResponse(result)

    if (!nft) {
      throw new Error(`Nft not found for tokenHash: ${params.tokenHash}`)
    }

    this.#nftsCache.set(result.id, nft)

    return nft
  }

  async getNftsByAddress({ address }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    const response = await axios.post<TMetaplexAssetByOwnerResponse>(this.#rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: address,
        page: 1,
        limit: 100,
        options: {
          showCollectionMetadata: true,
          showUnverifiedCollections: true,
        },
      },
    })

    const items: TNftResponse[] = []

    const promises = response.data.result.items.map(async nft => {
      const parsedNft = await this.#parseResponse(nft)
      if (!parsedNft) return

      this.#nftsCache.set(nft.id, parsedNft)

      items.push(parsedNft)
    })

    await Promise.allSettled(promises)

    return {
      items,
      nextPageParams: response.data.result.cursor,
    }
  }

  async hasToken({ address, collectionHash }: THasTokenParam): Promise<boolean> {
    const response = await axios.post<TMetaplexAssetByOwnerResponse>(this.#rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'searchAssets',
      params: {
        ownerAddress: address,
        grouping: [
          {
            groupKey: 'collection',
            groupValue: collectionHash,
          },
        ],
        limit: 1,
      },
    })

    return response.data.result.items.length > 0
  }
}
