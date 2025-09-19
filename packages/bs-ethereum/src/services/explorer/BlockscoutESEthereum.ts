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

  readonly _service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    this._service = service
  }

  getBaseUrl() {
    const baseUrl = BlockscoutESEthereum.DEFAULT_BASE_URL_BY_NETWORK_ID[this._service.network.id]
    if (!baseUrl) {
      throw new Error('Network not supported')
    }

    return baseUrl
  }

  buildTransactionUrl(hash: string): string {
    const baseURL = this.getBaseUrl()
    return `${baseURL}/tx/${this._service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    const baseURL = this.getBaseUrl()
    return `${baseURL}/address/${this._service.tokenService.normalizeHash(contractHash)}`
  }

  buildNftUrl(params: TBuildNftUrlParams): string {
    const baseURL = this.getBaseUrl()
    return `${baseURL}/token/${this._service.tokenService.normalizeHash(params.collectionHash)}/instance/${
      params.tokenHash
    }`
  }

  getAddressTemplateUrl() {
    try {
      const baseUrl = this.getBaseUrl()
      return `${baseUrl}/address/{address}`
    } catch {
      return undefined
    }
  }

  getTxTemplateUrl() {
    try {
      const baseUrl = this.getBaseUrl()
      return `${baseUrl}/tx/{txId}`
    } catch {
      return undefined
    }
  }

  getNftTemplateUrl() {
    try {
      const baseUrl = this.getBaseUrl()
      return `${baseUrl}/token/{collectionHash}/instance/{tokenHash}`
    } catch {
      return undefined
    }
  }

  getContractTemplateUrl() {
    try {
      const baseUrl = this.getBaseUrl()
      return `${baseUrl}/address/{hash}`
    } catch {
      return undefined
    }
  }
}
