import {
  NftResponse,
  NftsResponse,
  NetworkType,
  NftDataService,
  GetNftParam,
  GetNftsByAddressParams,
} from '@cityofzion/blockchain-service'
import qs from 'query-string'
import axios from 'axios'

import { GHOSTMARKET_CHAIN_BY_NETWORK_TYPE, GHOSTMARKET_URL_BY_NETWORK_TYPE } from './constants'

type GhostMarketNFT = {
  tokenId: string
  contract: {
    chain?: string
    hash: string
    symbol: string
  }
  creator: {
    address: string
    offchainName?: string
  }
  apiUrl?: string
  ownerships: {
    owner: {
      address?: string
    }
  }[]
  collection: {
    name?: string
    logoUrl?: string
  }
  metadata: {
    description: string
    mediaType: string
    mediaUri: string
    mintDate: number
    mintNumber: number
    name: string
  }
}

type GhostMarketAssets = {
  assets: GhostMarketNFT[]
  next: string
}

export class GhostMarketNDSNeo3 implements NftDataService {
  readonly #networkType: NetworkType

  constructor(networkType: NetworkType) {
    this.#networkType = networkType
  }

  async getNftsByAddress({ address, size = 18, cursor }: GetNftsByAddressParams): Promise<NftsResponse> {
    const url = this.getUrlWithParams({
      size,
      owners: [address],
      cursor: cursor,
    })
    const { data } = await axios.get<GhostMarketAssets>(url)
    const nfts = data.assets ?? []

    return { nextCursor: data.next, items: nfts.map(this.parse.bind(this)) }
  }

  async getNft({ contractHash, tokenId }: GetNftParam): Promise<NftResponse> {
    const url = this.getUrlWithParams({
      contract: contractHash,
      tokenIds: [tokenId],
    })
    const { data } = await axios.get<GhostMarketAssets>(url)
    return this.parse(data.assets[0])
  }

  private treatGhostMarketImage(srcImage?: string) {
    if (!srcImage) {
      return
    }

    if (srcImage.startsWith('ipfs://')) {
      const [, imageId] = srcImage.split('://')

      return `https://ghostmarket.mypinata.cloud/ipfs/${imageId}`
    }

    return srcImage
  }

  private getUrlWithParams(params: Record<string, any>) {
    const parameters = qs.stringify(
      {
        chain: GHOSTMARKET_CHAIN_BY_NETWORK_TYPE[this.#networkType],
        ...params,
      },
      { arrayFormat: 'bracket' }
    )
    return `${GHOSTMARKET_URL_BY_NETWORK_TYPE[this.#networkType]}/assets?${parameters}`
  }

  private parse(data: GhostMarketNFT) {
    const nftResponse: NftResponse = {
      collectionImage: this.treatGhostMarketImage(data.collection?.logoUrl),
      id: data.tokenId,
      contractHash: data.contract.hash,
      symbol: data.contract.symbol,
      collectionName: data.collection?.name,
      image: this.treatGhostMarketImage(data.metadata.mediaUri),
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
