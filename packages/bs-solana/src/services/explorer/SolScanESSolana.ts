import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSSolana } from '../../types'

export class SolScanESSolana implements IExplorerService {
  readonly #baseUrl = 'https://solscan.io'
  readonly #queryParams: string = ''
  readonly #service: IBSSolana

  constructor(service: IBSSolana) {
    if (service.network.type !== 'mainnet') {
      this.#queryParams = `?cluster=${service.network.id}`
    }

    this.#service = service
  }

  #validateValueLength(value?: string): value is string {
    return !!value?.length && value.length >= 4
  }

  buildTransactionUrl(transactionId: string) {
    if (!this.#validateValueLength(transactionId)) return undefined

    return this.getTransactionTemplateUrl().replace('{txId}', this.#service.tokenService.normalizeHash(transactionId))
  }

  buildContractUrl(contractHash: string) {
    if (!this.#validateValueLength(contractHash)) return undefined

    return this.getContractTemplateUrl().replace('{hash}', this.#service.tokenService.normalizeHash(contractHash))
  }

  buildNftUrl({ tokenHash }: TBuildNftUrlParams) {
    if (!this.#validateValueLength(tokenHash)) return undefined

    return this.getNftTemplateUrl().replace('{tokenHash}', this.#service.tokenService.normalizeHash(tokenHash))
  }

  buildAddressUrl(address: string) {
    if (!this.#validateValueLength(address)) return undefined

    return this.getAddressTemplateUrl()?.replace('{address}', address)
  }

  getAddressTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/account/{address}${this.#queryParams}`
  }

  getTransactionTemplateUrl(): string {
    return `${this.#baseUrl}/tx/{txId}${this.#queryParams}`
  }

  getNftTemplateUrl(): string {
    return `${this.#baseUrl}/token/{tokenHash}${this.#queryParams}`
  }

  getContractTemplateUrl(): string {
    return `${this.#baseUrl}/token/{hash}${this.#queryParams}`
  }
}
