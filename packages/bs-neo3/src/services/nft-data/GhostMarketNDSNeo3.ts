import { GetNftParam, GetNftsByAddressParams, Network, NftResponse, NftsResponse } from '@cityofzion/blockchain-service'
import axios from 'axios'
import qs from 'query-string'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { RpcNDSNeo3 } from './RpcNDSNeo3'

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

export class GhostMarketNDSNeo3 extends RpcNDSNeo3 {
  static CONFIG_BY_NETWORK_ID: Partial<
    Record<
      BSNeo3NetworkId,
      {
        url: string
        chain: string
      }
    >
  > = {
    mainnet: {
      url: 'https://api.ghostmarket.io/api/v2',
      chain: 'n3',
    },
    testnet: {
      url: 'https://api.ghostmarket.io/api/v2',
      chain: 'n3t',
    },
  }

  readonly #network: Network<BSNeo3NetworkId>

  constructor(network: Network<BSNeo3NetworkId>) {
    super(network)
    this.#network = network
  }

  async getNftsByAddress({ address, size = 18, cursor }: GetNftsByAddressParams): Promise<NftsResponse> {
    const url = this.#getUrlWithParams({
      size,
      owners: [address],
      cursor: cursor,
    })
    const { data } = await axios.get<GhostMarketAssets>(url)
    const nfts = data.assets ?? []

    return { nextCursor: data.next, items: nfts.map(this.#parse.bind(this)) }
  }

  async getNft({ contractHash, tokenId }: GetNftParam): Promise<NftResponse> {
    const url = this.#getUrlWithParams({
      contract: contractHash,
      tokenIds: [tokenId],
    })
    const { data } = await axios.get<GhostMarketAssets>(url)
    return this.#parse(data.assets[0])
  }

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
    const config = GhostMarketNDSNeo3.CONFIG_BY_NETWORK_ID[this.#network.id]
    if (!config) throw new Error('GhostMarketNDSNeo3 does not support this network')

    const parameters = qs.stringify(
      {
        chain: config.chain,
        ...params,
      },
      { arrayFormat: 'bracket' }
    )
    return `${config.url}/assets?${parameters}`
  }

  #parse(data: GhostMarketNFT) {
    const nftResponse: NftResponse = {
      collectionImage: this.#treatGhostMarketImage(data.collection?.logoUrl),
      id: data.tokenId,
      contractHash: data.contract.hash,
      symbol: data.contract.symbol,
      collectionName: data.collection?.name,
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
