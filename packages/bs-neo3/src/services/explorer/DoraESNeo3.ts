import { BSCommonConstants, type TBuildNftUrlParams, type IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSNeo3 } from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class DoraESNeo3<N extends string> implements IExplorerService {
  readonly #service: IBSNeo3<N>
  #baseUrl: string | undefined

  constructor(service: IBSNeo3<N>) {
    this.#service = service

    if (!BSNeo3Helper.isCustomNetwork(this.#service.network)) {
      this.#baseUrl = `${BSCommonConstants.DORA_URL}`
    }
  }

  buildTransactionUrl(hash: string): string | undefined {
    if (!this.#baseUrl || !hash?.length) return undefined

    return `${this.#baseUrl}/transaction/neo3/${
      this.#service.network.id
    }/${this.#service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string | undefined {
    if (!this.#baseUrl || !contractHash?.length) return undefined

    return `${this.#baseUrl}/contract/neo3/${
      this.#service.network.id
    }/${this.#service.tokenService.normalizeHash(contractHash)}`
  }

  buildNftUrl({ tokenHash, collectionHash }: TBuildNftUrlParams): string | undefined {
    if (!this.#baseUrl || !tokenHash?.length || !collectionHash?.length) return undefined
    return `${this.#baseUrl}/nft/neo3/${this.#service.network.id}/${collectionHash}/${tokenHash}`
  }

  buildAddressUrl(address: string): string | undefined {
    if (!this.#baseUrl || !address?.length) return undefined

    return `${this.#baseUrl}/address/neo3/${this.#service.network.id}/${address}`
  }

  getAddressTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/address/neo3/${this.#service.network.id}/{address}`
  }

  getTxTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/transaction/neo3/${this.#service.network.id}/{txId}`
  }

  getNftTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/nft/neo3/${this.#service.network.id}/{collectionHash}/{tokenHash}`
  }

  getContractTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/contract/neo3/${this.#service.network.id}/{hash}`
  }
}
