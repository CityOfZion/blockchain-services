import { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import { IBSSolana } from '../../types'

export class SolScanESSolana<N extends string> implements IExplorerService {
  readonly #baseUrl = 'https://solscan.io'
  readonly #queryParams: string = ''
  readonly #service: IBSSolana<N>

  constructor(service: IBSSolana<N>) {
    if (service.network.type !== 'mainnet') {
      this.#queryParams = `?cluster=${service.network.id}`
    }

    this.#service = service
  }

  buildTransactionUrl(hash: string): string {
    return `${this.#baseUrl}/tx/${this.#service.tokenService.normalizeHash(hash)}${this.#queryParams}`
  }

  buildContractUrl(contractHash: string): string {
    return `${this.#baseUrl}/token/${this.#service.tokenService.normalizeHash(contractHash)}${this.#queryParams}`
  }

  buildNftUrl({ tokenHash }: TBuildNftUrlParams): string {
    return this.buildContractUrl(tokenHash)
  }

  buildAddressUrl(address: string): string {
    return `${this.#baseUrl}/account/${address}${this.#queryParams}`
  }

  getAddressTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/account/{address}${this.#queryParams}`
  }

  getTxTemplateUrl(): string {
    return `${this.#baseUrl}/tx/{txId}${this.#queryParams}`
  }

  getNftTemplateUrl(): string {
    return `${this.#baseUrl}/token/{tokenHash}${this.#queryParams}`
  }

  getContractTemplateUrl(): string {
    return `${this.#baseUrl}/token/{hash}${this.#queryParams}`
  }
}
