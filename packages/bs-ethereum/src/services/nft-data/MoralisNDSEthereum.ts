import {
  BSCommonConstants,
  BSError,
  hasExplorerService,
  type INftDataService,
  type TBSNetwork,
  type TBSNetworkId,
  type TGetNftParams,
  type TGetNftsByAddressParams,
  type THasTokenParams,
  type TNftResponse,
  type TNftsResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import type {
  IBSEthereum,
  TBSEthereumNetworkId,
  TMoralisNDSEthereumNftMetadataApiResponse,
  TMoralisNDSEthereumNftsByAddressApiResponse,
} from '../../types'

export class MoralisNDSEthereum<N extends string, A extends TBSNetworkId> implements INftDataService {
  static readonly BASE_URL = `${BSCommonConstants.COZ_API_URL}/api/v2/meta`
  readonly #service: IBSEthereum<N, A>
  #apiInstance?: AxiosInstance
  readonly #nftsCacheMap: Map<string, TNftResponse> = new Map()

  constructor(service: IBSEthereum<N, A>) {
    this.#service = service
  }

  static getClient(network: TBSNetwork<TBSEthereumNetworkId>) {
    return axios.create({
      baseURL: MoralisNDSEthereum.BASE_URL,
      params: {
        chain: `0x${Number(network.id).toString(16)}`,
      },
    })
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = MoralisNDSEthereum.getClient(this.#service.network)
    }
    return this.#apiInstance
  }

  #parseResponse(data: TMoralisNDSEthereumNftMetadataApiResponse): TNftResponse {
    let explorerUri: string | undefined
    let collectionUrl: string | undefined
    const contractHash = data.token_address

    if (hasExplorerService(this.#service)) {
      explorerUri = this.#service.explorerService.buildNftUrl({
        tokenHash: data.token_id,
        collectionHash: contractHash,
      })
      collectionUrl = this.#service.explorerService.buildContractUrl(contractHash)
    }

    let nftName: string | undefined
    let image: string | undefined

    if (data.normalized_metadata) {
      nftName = data.normalized_metadata.name
      image = data.normalized_metadata.image
    }

    return {
      hash: data.token_id,
      collection: {
        hash: contractHash,
        name: data.name,
        url: collectionUrl,
      },
      symbol: data.symbol,
      image,
      name: nftName,
      explorerUri,
    }
  }

  #buildNftCacheKey(tokenHash: string, collectionHash: string): string {
    return `${tokenHash}-${collectionHash}`
  }

  async getNftsByAddress({ address, nextPageParams }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    const { data } = await this.#api.get<TMoralisNDSEthereumNftsByAddressApiResponse>(`${address}/nft`, {
      params: {
        limit: 25,
        cursor: nextPageParams,
      },
    })

    const nfts = data.result || []
    const items = nfts.map(nft => {
      const item = this.#parseResponse(nft)

      this.#nftsCacheMap.set(this.#buildNftCacheKey(nft.token_id, nft.token_address), item)
      return item
    })

    return { nextPageParams: data.cursor, items }
  }

  async getNft({ collectionHash, tokenHash }: TGetNftParams): Promise<TNftResponse> {
    if (!collectionHash) {
      throw new BSError('collectionHash is required to get NFT from MoralisNDSEthereum', 'REQUIRED_PARAMETER_MISSING')
    }

    const cacheKey = this.#buildNftCacheKey(tokenHash, collectionHash)
    const nftFromCache = this.#nftsCacheMap.get(cacheKey)
    if (nftFromCache) {
      return nftFromCache
    }

    const { data } = await this.#api.get<TMoralisNDSEthereumNftMetadataApiResponse>(
      `/nft/${collectionHash}/${tokenHash}`,
      {
        params: { normalizeMetadata: true },
      }
    )
    const nft = this.#parseResponse(data)
    this.#nftsCacheMap.set(cacheKey, nft)
    return nft
  }

  async hasToken({ address, collectionHash }: THasTokenParams): Promise<boolean> {
    try {
      if (!collectionHash) return false

      const { data } = await this.#api.get<TMoralisNDSEthereumNftsByAddressApiResponse>(`${address}/nft`, {
        params: {
          limit: 1,
          token_addresses: [collectionHash],
        },
      })

      return (data.result?.length ?? 0) > 0
    } catch {
      return false
    }
  }
}
