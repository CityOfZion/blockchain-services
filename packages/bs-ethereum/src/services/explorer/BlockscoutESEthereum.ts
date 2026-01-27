import { TBuildNftUrlParams, IExplorerService, TBSNetworkId } from '@cityofzion/blockchain-service'
import { IBSEthereum, TBSEthereumNetworkId } from '../../types'

export class BlockscoutESEthereum<N extends string, A extends TBSNetworkId> implements IExplorerService {
  static readonly DEFAULT_BASE_URL_BY_NETWORK_ID: Partial<Record<TBSEthereumNetworkId, string>> = {
    '1': 'https://eth.blockscout.com',
    '10': 'https://optimism.blockscout.com',
    '137': 'https://polygon.blockscout.com',
    '8453': 'https://base.blockscout.com',
    '42161': 'https://arbitrum.blockscout.com',
    '42220': 'https://explorer.celo.org/mainnet',
    '59144': 'https://explorer.linea.build',
    '1101': 'https://zkevm.blockscout.com',
    '11155111': 'https://eth-sepolia.blockscout.com',
  }

  #baseUrl: string | undefined

  readonly _service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>, baseUrl?: string) {
    this._service = service
    this.#baseUrl = baseUrl ?? BlockscoutESEthereum.DEFAULT_BASE_URL_BY_NETWORK_ID[this._service.network.id]
  }

  buildTransactionUrl(hash: string): string | undefined {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/tx/${this._service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string | undefined {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/address/${this._service.tokenService.normalizeHash(contractHash)}`
  }

  buildNftUrl(params: TBuildNftUrlParams): string | undefined {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/token/${this._service.tokenService.normalizeHash(params.collectionHash)}/instance/${
      params.tokenHash
    }`
  }

  getAddressTemplateUrl() {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/address/{address}`
  }

  getTxTemplateUrl() {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/tx/{txId}`
  }

  getNftTemplateUrl() {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/token/{collectionHash}/instance/{tokenHash}`
  }

  getContractTemplateUrl() {
    if (!this.#baseUrl) return undefined

    return `${this.#baseUrl}/address/{hash}`
  }
}
