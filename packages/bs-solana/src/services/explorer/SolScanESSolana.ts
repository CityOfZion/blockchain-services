import { BuildNftUrlParams, ExplorerService, Network, TokenService } from '@cityofzion/blockchain-service'
import { BSSolanaNetworkId } from '../../constants/BSSolanaConstants'
import { BSSolanaHelper } from '../../helpers/BSSolanaHelper'

export class SolScanESSolana implements ExplorerService {
  readonly #baseUrl = 'https://solscan.io'
  readonly #queryParams: string = ''
  readonly #tokenService: TokenService

  constructor(network: Network<BSSolanaNetworkId>, tokenService: TokenService) {
    if (!BSSolanaHelper.isMainnet(network)) {
      this.#queryParams = `?cluster=${network.id}`
    }

    this.#tokenService = tokenService
  }

  buildTransactionUrl(hash: string): string {
    return `${this.#baseUrl}/tx/${this.#tokenService.normalizeHash(hash)}${this.#queryParams}`
  }

  buildContractUrl(contractHash: string): string {
    return `${this.#baseUrl}/token/${this.#tokenService.normalizeHash(contractHash)}${this.#queryParams}`
  }

  buildNftUrl({ tokenHash }: BuildNftUrlParams): string {
    return this.buildContractUrl(tokenHash)
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
