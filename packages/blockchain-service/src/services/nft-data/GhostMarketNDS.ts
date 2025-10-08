import axios from 'axios'
import {
  TGetNftParam,
  TGetNftsByAddressParams,
  THasTokenParam,
  INftDataService,
  TNftResponse,
  TNftsResponse,
} from '../../interfaces'
import qs from 'query-string'
import { TGhostMarketNDSNeo3AssetApiResponse, TGhostMarketNDSNeo3GetAssetsApiResponse } from '../../types'

export abstract class GhostMarketNDS implements INftDataService {
  static readonly BASE_URL: string = 'https://api.ghostmarket.io/api/v2'

  async getNftsByAddress({ address, size = 18, cursor }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    const url = this.#getUrlWithParams({
      size,
      owners: [address],
      cursor: cursor,
    })
    const { data } = await axios.get<TGhostMarketNDSNeo3GetAssetsApiResponse>(url)
    const nfts = data.assets ?? []

    return { nextCursor: data.next, items: nfts.map(this.#parse.bind(this)) }
  }

  async getNft({ collectionHash, tokenHash }: TGetNftParam): Promise<TNftResponse> {
    const url = this.#getUrlWithParams({
      contract: collectionHash,
      tokenIds: [tokenHash],
    })
    const { data } = await axios.get<TGhostMarketNDSNeo3GetAssetsApiResponse>(url)
    return this.#parse(data.assets[0])
  }

  abstract hasToken({ collectionHash, address }: THasTokenParam): Promise<boolean>

  abstract getChain(): string

  #treatGhostMarketImage(srcImage?: string) {
    if (!srcImage) {
      return
    }

    if (srcImage.startsWith('ipfs://')) {
      const splitImage = srcImage.split('/')
      const imageId = splitImage.slice(-2).filter(Boolean).join('/')

      return `https://ghostmarket.mypinata.cloud/ipfs/${imageId}`
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
      creator: {
        address: data.creator.address,
        name: data.creator.offchainName,
      },
    }

    return nftResponse
  }
}
