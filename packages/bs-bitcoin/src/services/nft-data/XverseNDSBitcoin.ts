import {
  BSError,
  type INftDataService,
  type TGetNftParams,
  type TGetNftsByAddressParams,
  type THasTokenParams,
  type TNftResponse,
  type TNftsResponse,
} from '@cityofzion/blockchain-service'

import type {
  IBSBitcoin,
  TXverseCollectionInscriptionsResponse,
  TXverseInscriptionResponse,
  TXverseInscriptionsResponse,
} from '../../types'
import { BSBitcoinXverseHelper } from '../../helpers/BSBitcoinXverseHelper'

export class XverseNDSBitcoin<N extends string> implements INftDataService {
  readonly #contentTypeSvg = 'image/svg+xml'
  readonly #service: IBSBitcoin<N>
  readonly #xverseApi = BSBitcoinXverseHelper.getApi()
  readonly #cachedNfts = new Map<string, TNftResponse>()

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
  }

  #validateMainnet() {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  #transformXverseInscriptionToNft({
    collectionId,
    collectionName,
    ...inscription
  }: TXverseInscriptionResponse): TNftResponse {
    const hash = inscription.id
    const isSvg =
      !!inscription.contentType?.includes(this.#contentTypeSvg) ||
      !!inscription.effectiveContentType?.includes(this.#contentTypeSvg)

    const nft: TNftResponse = {
      hash,
      name: inscription.name || inscription.number.toString(),
      explorerUri: this.#service.explorerService.buildNftUrl({ tokenHash: hash }),
      image: inscription.renderUrl,
      isSVG: isSvg,
      symbol: inscription.collectionSymbol,
      collection:
        !!collectionId && !!collectionName
          ? {
              hash: collectionId,
              name: collectionName,
              url: `https://unisat.io/market/collection?collectionId=${collectionId}`,
            }
          : undefined,
    }

    this.#cachedNfts.set(hash, nft)

    return nft
  }

  async getNftsByAddress({ address, nextPageParams }: TGetNftsByAddressParams): Promise<TNftsResponse> {
    this.#validateMainnet()

    const limit = 25
    let offset = 0

    if (nextPageParams) {
      offset = parseInt(nextPageParams)

      if (!offset || offset < 0) offset = 0
    }

    const { data } = await this.#xverseApi.get<TXverseInscriptionsResponse>(
      `/v1/ordinals/address/${address}/inscriptions`,
      {
        params: { offset, limit },
      }
    )

    const items = data.items.map<TNftResponse>(this.#transformXverseInscriptionToNft.bind(this))
    const nextOffset = offset + limit

    return { items, nextPageParams: items.length === limit ? nextOffset : undefined }
  }

  async getNft(params: TGetNftParams): Promise<TNftResponse> {
    this.#validateMainnet()

    const { tokenHash } = params
    const cachedNft = this.#cachedNfts.get(tokenHash)

    if (cachedNft) return cachedNft

    const { data } = await this.#xverseApi.get<TXverseInscriptionResponse>(`/v1/inscriptions/${tokenHash}`)

    return this.#transformXverseInscriptionToNft(data)
  }

  async hasToken({ address, collectionHash }: THasTokenParams): Promise<boolean> {
    this.#validateMainnet()

    const { data } = await this.#xverseApi.get<TXverseCollectionInscriptionsResponse>(
      `/v1/ordinals/address/${address}/inscriptions/collection/${collectionHash}`,
      { params: { offset: 0, limit: 25 } }
    )

    return data.total > 0
  }
}
