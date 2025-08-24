import {
  GetNftParam,
  GetNftsByAddressParams,
  HasTokenParam,
  INftDataService,
  NftResponse,
  NftsResponse,
} from '@cityofzion/blockchain-service'
import solanaSDK, { PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import { BSSolanaCachedMethodsHelper } from '../../helpers/BSSolanaCachedMethodsHelper'
import { TatumRpcBDSSolana } from '../blockchain-data/TatumRpcBDSSolana'
import { IBSSolana } from '../../types'

export class TatumRpcNDSSolana<N extends string> implements INftDataService {
  readonly #connection: solanaSDK.Connection
  readonly #metaplex: Metaplex

  constructor(service: IBSSolana<N>) {
    this.#connection = TatumRpcBDSSolana.getConnection(service.network)
    this.#metaplex = Metaplex.make(this.#connection)
  }

  async getNft(params: GetNftParam): Promise<NftResponse> {
    try {
      const nftFromMetaplex = await BSSolanaCachedMethodsHelper.getMetaplexMetadata(params.tokenHash, this.#connection)

      if (!nftFromMetaplex || nftFromMetaplex.model !== 'nft') {
        throw new Error('NFT not found')
      }

      let collectionName: string | undefined
      let collectionImage: string | undefined
      const collectionHash = nftFromMetaplex.collection?.address.toBase58() ?? params.collectionHash

      try {
        const collectionMetaplex = await BSSolanaCachedMethodsHelper.getMetaplexMetadata(
          collectionHash,
          this.#connection
        )

        if (collectionMetaplex?.model === 'nft') {
          collectionName = collectionMetaplex?.name
          collectionImage = collectionMetaplex?.json?.image
        }
      } catch {
        /* empty */
      }

      const nft: NftResponse = {
        hash: params.tokenHash,
        collection: {
          hash: collectionHash,
          name: collectionName,
          image: collectionImage,
        },
        creator: {
          address: nftFromMetaplex.creators?.[0]?.address.toBase58() ?? '',
        },
        symbol: nftFromMetaplex.symbol,
        image: nftFromMetaplex.json?.image,
        name: nftFromMetaplex.name,
      }

      return nft
    } catch {
      throw new Error('NFT not found')
    }
  }

  async getNftsByAddress({ address }: GetNftsByAddressParams): Promise<NftsResponse> {
    const nftsFromMetaplex = await this.#metaplex.nfts().findAllByOwner({
      owner: new PublicKey(address),
    })

    const items: NftResponse[] = []

    const promises = nftsFromMetaplex.map(async nftFromMetaplex => {
      if (nftFromMetaplex.model === 'sft') return

      let tokenHash: string
      let collectionHash: string

      if (nftFromMetaplex.model === 'nft') {
        tokenHash = nftFromMetaplex.mint.address.toBase58()
        collectionHash = nftFromMetaplex.collection?.address.toBase58() ?? ''
      } else {
        tokenHash = nftFromMetaplex.mintAddress.toBase58()
        collectionHash = nftFromMetaplex.collection?.address.toBase58() ?? ''
      }

      const nft = await this.getNft({
        tokenHash,
        collectionHash,
      })

      items.push(nft)
    })

    await Promise.allSettled(promises)

    return {
      items,
    }
  }

  async hasToken({ address, collectionHash }: HasTokenParam): Promise<boolean> {
    const nftsFromMetaplex = await this.#metaplex.nfts().findAllByOwner({
      owner: new PublicKey(address),
    })

    for (const nftFromMetaplex of nftsFromMetaplex) {
      if (nftFromMetaplex.collection?.address.toBase58() === collectionHash) {
        return true
      }
    }

    return false
  }
}
