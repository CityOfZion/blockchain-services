import {
  BSError,
  type INftDataService,
  type TGetNftParams,
  type TGetNftsByAddressParams,
  type THasTokenParams,
  type TNftResponse,
  type TNftsResponse,
} from '@cityofzion/blockchain-service'

import type { IBSBitcoin, THiroInscriptionResponse, THiroInscriptionsResponse } from '../../types'
import { BSBitcoinHiroHelper } from '../../helpers/BSBitcoinHiroHelper'
import { BSBitcoinHelper } from '../../helpers/BSBitcoinHelper'

// TODO: search how UniScan find the NFT collection (e.g.: https://uniscan.cc/inscription/e2502ff5df232c31b2dd3370a9f3476693df61175c44b07542aab338a9cb6cf6i888)
export class HiroUniSatNDSBitcoin<N extends string> implements INftDataService {
  readonly #maxPageSize = 60
  readonly #mimeTypeSvg = 'image/svg+xml'
  readonly #uniSatPreviewUrl = 'https://static.unisat.space/preview'
  readonly #service: IBSBitcoin<N>
  readonly #cachedNfts = new Map<string, TNftResponse>()
  readonly #hiroApi = BSBitcoinHiroHelper.getApi()

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
  }

  #validateMainnet() {
    if (!BSBitcoinHelper.isMainnetNetwork(this.#service.network)) {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  #transformHiroInscriptionToNft(inscription: THiroInscriptionResponse): TNftResponse {
    const isSvg =
      inscription.mime_type.includes(this.#mimeTypeSvg) || inscription.content_type.includes(this.#mimeTypeSvg)

    const hash = inscription.id

    const nft: TNftResponse = {
      hash,
      name: inscription.number.toString(),
      explorerUri: this.#service.explorerService.buildNftUrl({ tokenHash: hash }),
      image: `${this.#uniSatPreviewUrl}/${hash}`,
      isSVG: isSvg,
      isIframePreview: true,
      creator: {
        address: inscription.genesis_address,
      },
    }

    this.#cachedNfts.set(hash, nft)

    return nft
  }

  async getNftsByAddress({
    address,
    cursor,
    page,
    size = this.#maxPageSize,
  }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    this.#validateMainnet()

    if (size < 1 || size > this.#maxPageSize) {
      throw new BSError(`Size should be between 1 and ${this.#maxPageSize}`, 'INVALID_SIZE')
    }

    let offset = 0

    if (cursor) {
      offset = parseInt(cursor)

      if (!offset || offset < 0) offset = 0
    } else if (typeof page === 'number' && page >= 1) {
      offset = (page - 1) * size
    }

    const { data } = await this.#hiroApi.get<THiroInscriptionsResponse>('/ordinals/v1/inscriptions', {
      params: { address, offset, limit: size },
    })

    const nextOffset = offset + size
    const hasNextOffSet = data.total - nextOffset > 0
    const items = data.results.map<TNftResponse>(this.#transformHiroInscriptionToNft.bind(this))

    return { items, nextPageParams: hasNextOffSet ? nextOffset : undefined }
  }

  async getNft(params: TGetNftParams): Promise<TNftResponse> {
    this.#validateMainnet()

    const { tokenHash } = params
    const cachedNft = this.#cachedNfts.get(tokenHash)

    if (cachedNft) return cachedNft

    const { data } = await this.#hiroApi.get<THiroInscriptionResponse>(`/ordinals/v1/inscriptions/${tokenHash}`)

    return this.#transformHiroInscriptionToNft(data)
  }

  async hasToken(_params: THasTokenParams): Promise<boolean> {
    throw new BSError('There is no collection hash on Bitcoin', 'NO_COLLECTION_HASH')
  }
}
