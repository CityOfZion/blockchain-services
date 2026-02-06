import axios from 'axios'
import {
  TGetNftParam,
  TGetNftsByAddressParams,
  THasTokenParam,
  INftDataService,
  TNftResponse,
  TNftsResponse,
  type IBlockchainService,
} from '../../interfaces'
import qs from 'query-string'
import { TGhostMarketNDSNeo3AssetApiResponse, TGhostMarketNDSNeo3GetAssetsApiResponse } from '../../types'
import { hasExplorerService } from '../../functions'
import { BSError } from '../../error'

export abstract class GhostMarketNDS<N extends string, A extends string, T extends IBlockchainService<N, A>>
  implements INftDataService
{
  static readonly BASE_URL: string = 'https://api.ghostmarket.io/api/v2'

  _service: T

  #nftsCacheMap: Map<string, TNftResponse> = new Map()

  constructor(service: T) {
    this._service = service
  }

  #treatGhostMarketImage(srcImage?: string) {
    if (!srcImage) {
      return
    }

    if (srcImage.startsWith('ipfs://')) {
      const splitImage = srcImage.split('/')
      const imageId = splitImage.slice(-2).filter(Boolean).join('/')

      return `https://cdn.ghostmarket.io/ext-full/${imageId}`
    }

    return srcImage
  }

  #getUrlWithParams(params: Record<string, any>) {
    const chain = this.getChain()

    if (!chain) throw new Error('GhostMarketNDSNeo3 does not support this network')

    const parameters = qs.stringify(
      {
        chain,
        ownersChains: [chain],
        ...params,
      },
      { arrayFormat: 'bracket' }
    )
    return `${GhostMarketNDS.BASE_URL}/assets?${parameters}`
  }

  #parse(data: TGhostMarketNDSNeo3AssetApiResponse): TNftResponse {
    let explorerUri: string | undefined

    if (hasExplorerService(this._service)) {
      explorerUri = this._service.explorerService.buildNftUrl({
        tokenHash: data.tokenId,
        collectionHash: data.contract.hash,
      })
    }

    const nftResponse: TNftResponse = {
      hash: data.tokenId,
      collection: {
        hash: data.contract.hash,
        name: data.collection?.name,
        image: this.#treatGhostMarketImage(data.collection?.logoUrl),
      },
      symbol: data.contract.symbol,
      image: this.#treatGhostMarketImage(data.metadata.mediaUri),
      isSVG: String(data.metadata.mediaType).includes('svg+xml'),
      name: data.metadata.name,
      explorerUri,
      creator: {
        address: data.creator.address,
        name: data.creator.offchainName,
      },
    }

    return nftResponse
  }

  #buildNftsCacheKey(collectionHash: string, tokenHash: string): string {
    return `${collectionHash}-${tokenHash}`
  }

  async getNftsByAddress({ address, size = 18, cursor }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    const url = this.#getUrlWithParams({
      size,
      owners: [address],
      cursor: cursor,
    })
    const { data } = await axios.get<TGhostMarketNDSNeo3GetAssetsApiResponse>(url)
    const nfts = data.assets ?? []

    const items = nfts.map(nft => {
      const item = this.#parse(nft)
      this.#nftsCacheMap.set(this.#buildNftsCacheKey(nft.contract.hash, nft.tokenId), item)
      return item
    })

    return { nextPageParams: data.next, items }
  }

  async getNft({ collectionHash, tokenHash }: TGetNftParam): Promise<TNftResponse> {
    if (!collectionHash) {
      throw new BSError('collectionHash is required to get NFT from GhostMarketNDSNeo3', 'REQUIRED_PARAMETER_MISSING')
    }

    const cacheKey = this.#buildNftsCacheKey(collectionHash, tokenHash)
    const nftFromCache = this.#nftsCacheMap.get(cacheKey)
    if (nftFromCache) {
      return nftFromCache
    }

    const url = this.#getUrlWithParams({
      contract: collectionHash,
      tokenIds: [tokenHash],
    })
    const { data } = await axios.get<TGhostMarketNDSNeo3GetAssetsApiResponse>(url)

    const nft = this.#parse(data.assets[0])

    this.#nftsCacheMap.set(cacheKey, nft)

    return nft
  }

  abstract hasToken({ collectionHash, address }: THasTokenParam): Promise<boolean>

  abstract getChain(): string
}
