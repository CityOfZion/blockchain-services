import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'

export class NeoTubeESNeoLegacy implements IExplorerService {
  #baseUrl: string | undefined

  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    this.#service = service

    if (this.#service.network.type === 'mainnet') {
      this.#baseUrl = 'https://neo2.neotube.io'
    }
  }

  #validateValueLength(value?: string): value is string {
    return !!value?.length && value.length >= 4
  }

  buildTransactionUrl(transactionId: string) {
    if (!this.#validateValueLength(transactionId)) return undefined

    return this.getTransactionTemplateUrl()?.replace('{txId}', this.#service.tokenService.normalizeHash(transactionId))
  }

  buildContractUrl(contractHash: string) {
    if (!this.#validateValueLength(contractHash)) return undefined

    return this.getContractTemplateUrl()?.replace('{hash}', this.#service.tokenService.normalizeHash(contractHash))
  }

  buildNftUrl(_params: TBuildNftUrlParams) {
    return this.getNftTemplateUrl()
  }

  buildAddressUrl(address: string) {
    if (!this.#validateValueLength(address)) return undefined

    return this.getAddressTemplateUrl()?.replace('{address}', address)
  }

  getAddressTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/address/{address}`
  }

  getTransactionTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/transaction/{txId}`
  }

  getNftTemplateUrl() {
    return undefined
  }

  getContractTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/asset/{hash}/page/1`
  }
}
