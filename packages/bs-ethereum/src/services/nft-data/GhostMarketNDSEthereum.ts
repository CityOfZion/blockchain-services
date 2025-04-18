import { NftResponse, NftsResponse, GetNftParam, GetNftsByAddressParams, Network } from '@cityofzion/blockchain-service'
import qs from 'query-string'
import axios from 'axios'

import { RpcNDSEthereum } from './RpcNDSEthereum'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'

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

export class GhostMarketNDSEthereum extends RpcNDSEthereum {
  static readonly BASE_URL = 'https://api.ghostmarket.io/api/v2'
  static CONFIG_BY_NETWORK_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    '1': 'eth',
    '56': 'bsc',
    '137': 'polygon',
    '43114': 'avalanche',
    '8453': 'base',
    [BSEthereumConstants.NEOX_MAINNET_NETWORK_ID]: 'neox',
  }

  #network: Network<BSEthereumNetworkId>

  constructor(network: Network<BSEthereumNetworkId>) {
    super(network)
    this.#network = network
  }

  async getNftsByAddress({ address, size = 18, cursor }: GetNftsByAddressParams): Promise<NftsResponse> {
    const url = this.getUrlWithParams({
      size,
      owners: [address],
      cursor: cursor,
    })

    const request = await axios.get<GhostMarketAssets>(url)
    const nfts = request.data.assets ?? []
    return { nextCursor: request.data.next, items: nfts.map(this.parse.bind(this)) }
  }

  async getNft({ contractHash, tokenId }: GetNftParam): Promise<NftResponse> {
    const url = this.getUrlWithParams({
      contract: contractHash,
      tokenIds: [tokenId],
    })

    const request = await axios.get<GhostMarketAssets>(url)

    return this.parse(request.data.assets[0])
  }

  private treatGhostMarketImage(srcImage?: string) {
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

  private getUrlWithParams(params: any) {
    const chain = GhostMarketNDSEthereum.CONFIG_BY_NETWORK_ID[this.#network.id]

    if (!chain) throw new Error('Unsupported network')

    const parameters = qs.stringify(
      {
        chain,
        ownersChains: [chain],
        ...params,
      },
      { arrayFormat: 'bracket' }
    )

    return `${GhostMarketNDSEthereum.BASE_URL}/assets?${parameters}`
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
