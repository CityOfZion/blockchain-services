import { BuildNftUrlParams, ExplorerService, Network, NetworkId } from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumTokenHelper } from '../../helpers/BSEthereumTokenHelper'

const DEFAULT_BASE_URL_BY_NETWORK_ID: Partial<Record<BSEthereumNetworkId, string>> = {
  [BSEthereumConstants.ETHEREUM_MAINNET_NETWORK_ID]: 'https://eth.blockscout.com',
  '10': 'https://optimism.blockscout.com',
  [BSEthereumConstants.POLYGON_MAINNET_NETWORK_ID]: 'https://polygon.blockscout.com',
  [BSEthereumConstants.BASE_MAINNET_NETWORK_ID]: 'https://base.blockscout.com',
  [BSEthereumConstants.ARBITRUM_MAINNET_NETWORK_ID]: 'https://arbitrum.blockscout.com',
  '42220': 'https://explorer.celo.org/mainnet',
  '59144': 'https://explorer.linea.build',
  '1101': 'https://zkevm.blockscout.com',
  '11155111': 'https://eth-sepolia.blockscout.com',
}

export class BlockscoutESEthereum<BSNetworkId extends NetworkId = BSEthereumNetworkId> implements ExplorerService {
  readonly #network: Network<BSEthereumNetworkId>
  readonly #baseUrlByNetworkId: Partial<Record<BSNetworkId, string>>

  constructor(network: Network<BSEthereumNetworkId>, baseUrlByNetworkId?: Partial<Record<BSNetworkId, string>>) {
    this.#network = network
    this.#baseUrlByNetworkId = baseUrlByNetworkId ?? DEFAULT_BASE_URL_BY_NETWORK_ID
  }

  #getBaseUrl(network: Network<BSEthereumNetworkId>) {
    const baseUrl = this.#baseUrlByNetworkId[network.id as BSNetworkId]

    if (!baseUrl) {
      throw new Error('Network not supported')
    }

    return baseUrl
  }

  buildTransactionUrl(hash: string): string {
    const baseURL = this.#getBaseUrl(this.#network)
    return `${baseURL}/tx/${BSEthereumTokenHelper.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    const baseURL = this.#getBaseUrl(this.#network)
    return `${baseURL}/address/${BSEthereumTokenHelper.normalizeHash(contractHash)}`
  }

  buildNftUrl(params: BuildNftUrlParams): string {
    const baseURL = this.#getBaseUrl(this.#network)
    return `${baseURL}/token/${BSEthereumTokenHelper.normalizeHash(params.contractHash)}/instance/${params.tokenId}`
  }

  getAddressTemplateUrl() {
    try {
      const baseUrl = this.#getBaseUrl(this.#network)
      return `${baseUrl}/address/{address}`
    } catch {
      return undefined
    }
  }

  getTxTemplateUrl() {
    try {
      const baseUrl = this.#getBaseUrl(this.#network)
      return `${baseUrl}/tx/{txId}`
    } catch {
      return undefined
    }
  }

  getNftTemplateUrl() {
    try {
      const baseUrl = this.#getBaseUrl(this.#network)
      return `${baseUrl}/token/{hash}/instance/{tokenId}`
    } catch {
      return undefined
    }
  }

  getContractTemplateUrl() {
    try {
      const baseUrl = this.#getBaseUrl(this.#network)
      return `${baseUrl}/address/{hash}`
    } catch {
      return undefined
    }
  }
}
