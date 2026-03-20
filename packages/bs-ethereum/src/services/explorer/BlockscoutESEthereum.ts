import type { TBuildNftUrlParams, IExplorerService, TBSNetworkId } from '@cityofzion/blockchain-service'
import type { IBSEthereum, TBSEthereumNetworkId } from '../../types'

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

  #validateValueLength(value?: string, minimumLength?: number): value is string {
    return !!value?.length && value.length >= (minimumLength || 4)
  }

  buildTransactionUrl(transactionId: string) {
    if (!this.#validateValueLength(transactionId)) return undefined

    return this.getTransactionTemplateUrl()?.replace('{txId}', this._service.tokenService.normalizeHash(transactionId))
  }

  buildContractUrl(contractHash: string) {
    if (!this.#validateValueLength(contractHash, 1)) return undefined

    return this.getContractTemplateUrl()?.replace('{hash}', this._service.tokenService.normalizeHash(contractHash))
  }

  buildNftUrl({ tokenHash, collectionHash }: TBuildNftUrlParams) {
    if (!this.#validateValueLength(tokenHash, 1) || !this.#validateValueLength(collectionHash)) return undefined

    return this.getNftTemplateUrl()
      ?.replace('{tokenHash}', tokenHash)
      ?.replace('{collectionHash}', this._service.tokenService.normalizeHash(collectionHash))
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
