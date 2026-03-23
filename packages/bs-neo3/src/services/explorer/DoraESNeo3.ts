import { BSCommonConstants, type TBuildNftUrlParams, type IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSNeo3 } from '../../types'

export class DoraESNeo3 implements IExplorerService {
  readonly #service: IBSNeo3
  #baseUrl: string | undefined

  constructor(service: IBSNeo3) {
    this.#service = service

    if (service.network.type !== 'custom') {
      this.#baseUrl = BSCommonConstants.DORA_URL
    }
  }

  #validateValueLength(value?: string, minimumLength?: number): value is string {
    return !!value?.length && value.length >= (minimumLength || 4)
  }

  buildTransactionUrl(transactionId: string) {
    if (!this.#validateValueLength(transactionId)) return undefined

    return this.getTransactionTemplateUrl()?.replace('{txId}', this.#service.tokenService.normalizeHash(transactionId))
  }

  buildContractUrl(contractHash: string) {
    if (!this.#validateValueLength(contractHash)) return undefined

    return this.getContractTemplateUrl()?.replace('{hash}', this.#service.tokenService.normalizeHash(contractHash))
  }

  buildNftUrl({ tokenHash, collectionHash }: TBuildNftUrlParams) {
    if (!this.#validateValueLength(tokenHash, 1) || !this.#validateValueLength(collectionHash)) {
      return undefined
    }

    return this.getNftTemplateUrl()?.replace('{tokenHash}', tokenHash)?.replace('{collectionHash}', collectionHash)
  }

  buildAddressUrl(address: string) {
    if (!this.#validateValueLength(address)) return undefined

    return this.getAddressTemplateUrl()?.replace('{address}', address)
  }

  getAddressTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/address/neo3/${this.#service.network.id}/{address}`
  }

  getTransactionTemplateUrl() {
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
