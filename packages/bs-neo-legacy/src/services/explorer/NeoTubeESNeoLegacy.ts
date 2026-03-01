import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class NeoTubeESNeoLegacy<N extends string> implements IExplorerService {
  #baseUrl: string | undefined

  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service

    if (BSNeoLegacyHelper.isMainnetNetwork(this.#service.network)) {
      this.#baseUrl = 'https://neo2.neotube.io'
    }
  }

  buildTransactionUrl(hash: string): string | undefined {
    if (!this.#baseUrl || !hash?.length) return undefined

    return `${this.#baseUrl}/transaction/${this.#service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string | undefined {
    if (!this.#baseUrl || !contractHash?.length) return undefined

    return `${this.#baseUrl}/asset/${this.#service.tokenService.normalizeHash(contractHash)}/page/1`
  }

  buildNftUrl(_params: TBuildNftUrlParams): string | undefined {
    return undefined
  }

  buildAddressUrl(address: string): string | undefined {
    if (!this.#baseUrl || !address?.length) return undefined

    return `${this.#baseUrl}/address/${address}`
  }

  getAddressTemplateUrl() {
    if (!this.#baseUrl) return undefined
    return `${this.#baseUrl}/address/{address}`
  }

  getTxTemplateUrl() {
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
