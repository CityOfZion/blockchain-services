import { BlockchainService, NFTResponse, NFTSResponse, NetworkType } from "@cityofzion/blockchain-service";
import qs from "querystringify"
import axios from 'axios'

type ImgMediaTypes = 'image/svg+xml' | 'image/png' | 'image/jpeg'

interface GhostMarketNFT {
    tokenId: string
    contract: {
        chain?: string
        hash: string
        symbol: string
    }
    creator: {
        address?: string
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
        mediaType: ImgMediaTypes
        mediaUri: string
        mintDate: number
        mintNumber: number
        name: string
    }
}

interface GhostMarketAssets {
    assets: GhostMarketNFT[]
    total: number
}

interface GhostMarketAsset {
    assets: [
        {
            collection: {
                logo_url: string,
                name: string
            },
            metadata: {
                mediaUri: string,
                name: string,
                mediaType: ImgMediaTypes
            },
            contract: {
                symbol: string,
                hash: string
            },
            tokenId: string
        }
    ]
}

type ParamsTypeNFTS = {
    owners: string[],
    size: number,
    page: number,
    getTotal: boolean
}

type ParamsTypeNFT = {
    ["tokenIds[]"]: string[]
    contract: string
}
/**
 * NDS = NFT Data Service
 */
export class GhostMarketNDS {
    private blockchain: BlockchainService
    private baseUrl: Partial<Record<NetworkType, string>> = { mainnet: "https://api.ghostmarket.io/api/v2", testnet: "https://api-testnet.ghostmarket.io/api/v2" }
    private ghostMarketNetworks: Partial<Record<NetworkType, string>> = {
        mainnet: 'n3',
        testnet: 'n3t'
    }
    path: string = 'assets'
    private readonly url: string
    constructor(blockchain: BlockchainService) {
        this.blockchain = blockchain
        this.url = `${this.baseUrl[this.blockchain.network.type]}/${this.path}`
    }

    async getNFT(params: ParamsTypeNFT) {
        const url = this.getUrlWithParams(params)
        const response = (await axios.get<GhostMarketAsset>(url)).data
        return this.toNFTResponse(response, params["tokenIds[]"])
    }

    async getNFTS(params: ParamsTypeNFTS) {
        const url = this.getUrlWithParams(params)
        const response = (await axios.get<GhostMarketAssets>(url)).data
        return this.toNFTSResponse(response, params.size)
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

    private getUrlWithParams<T = any>(params: T) {
        const parameters = qs.stringify(
            {
                chain: this.ghostMarketNetworks[this.blockchain.network.type],
                ...params
            }
        )
        return `${this.url}?${parameters}`
    }
    private toNFTResponse(response: GhostMarketAsset, tokenID: string[]) {
        const { assets } = response

        const nft = assets.find(asset => {

            return tokenID.includes(asset.tokenId)
        })
        if (!nft) throw new Error("NFT not found");

        const nftResponse: NFTResponse = {
            collectionImage: this.treatGhostMarketImage(nft.collection?.logo_url),
            id: nft.tokenId,
            contractHash: nft.contract.hash,
            symbol: nft.contract.symbol,
            collectionName: nft.collection?.name,
            image: this.treatGhostMarketImage(nft.metadata.mediaUri),
            isSVG: nft.metadata.mediaType.includes('svg+xml'),
            name: nft.metadata.name
        }

        return nftResponse;
    }
    private toNFTSResponse(response: GhostMarketAssets, nftPageLimit: number) {
        const { assets, total } = response
        const totalPages = Math.ceil(total / nftPageLimit)
        const nfts = assets.map<NFTResponse>(asset => ({
            collectionImage: this.treatGhostMarketImage(asset.collection.logoUrl),
            collectionName: asset.collection.name,
            image: this.treatGhostMarketImage(asset.metadata.mediaUri),
            name: asset.metadata.name,
            symbol: asset.contract.symbol,
            id: asset.tokenId,
            contractHash: asset.contract.hash,
            isSVG: String(asset.metadata.mediaType).includes('svg+xml'),
        }))

        const nftsResponse: NFTSResponse = {
            totalPages: totalPages,
            items: nfts
        }

        return nftsResponse
    }
}