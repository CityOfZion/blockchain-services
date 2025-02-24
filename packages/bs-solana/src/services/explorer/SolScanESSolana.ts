import { BuildNftUrlParams, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSSolanaNetworkId } from '../../constants/BSSolanaConstants'
import { BSSolanaHelper } from '../../helpers/BSSolanaHelper'

export class SolScanESSolana implements ExplorerService {
  readonly #baseUrl = 'https://solscan.io'
  readonly #queryParams: string = ''

  constructor(network: Network<BSSolanaNetworkId>) {
    if (!BSSolanaHelper.isMainnet(network)) {
      this.#queryParams = `cluster=${network.id}`
    }
  }

  buildTransactionUrl(hash: string): string {
    return `${this.#baseUrl}/tx/${hash}?${this.#queryParams}`
  }

  buildContractUrl(contractHash: string): string {
    return `${this.#baseUrl}/token/${contractHash}?${this.#queryParams}`
  }

  buildNftUrl({ tokenHash }: BuildNftUrlParams): string {
    return this.buildContractUrl(tokenHash)
  }

  getAddressTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/account/{address}?${this.#queryParams}`
  }

  getTxTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/tx/{txId}?${this.#queryParams}`
  }
}
