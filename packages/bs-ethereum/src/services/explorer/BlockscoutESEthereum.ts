import { BuildNftUrlParams, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'

export class BlockscoutESEthereum implements ExplorerService {
  static BASE_URL_BY_CHAIN_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    [BSEthereumConstants.ETHEREUM_MAINNET_NETWORK_ID]: 'https://eth.blockscout.com',
    '10': 'https://optimism.blockscout.com',
    [BSEthereumConstants.POLYGON_MAINNET_NETWORK_ID]: 'https://polygon.blockscout.com',
    [BSEthereumConstants.BASE_MAINNET_NETWORK_ID]: 'https://base.blockscout.com',
    [BSEthereumConstants.ARBITRUM_MAINNET_NETWORK_ID]: 'https://arbitrum.blockscout.com',
    '42220': 'https://explorer.celo.org/mainnet',
    [BSEthereumConstants.NEOX_MAINNET_NETWORK_ID]: 'https://xexplorer.neo.org',
    '59144': 'https://explorer.linea.build',

    '1101': 'https://zkevm.blockscout.com',
    '11155111': 'https://eth-sepolia.blockscout.com',
    [BSEthereumConstants.NEOX_TESTNET_NETWORK_ID]: 'https://xt4scan.ngd.network',
  }

  static isSupported(network: Network<BSEthereumNetworkId>) {
    return !!BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[network.id]
  }

  readonly #network: Network<BSEthereumNetworkId>

  constructor(network: Network<BSEthereumNetworkId>) {
    this.#network = network
  }

  buildTransactionUrl(hash: string): string {
    if (!BlockscoutESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/tx/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (!BlockscoutESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/address/${contractHash}`
  }

  buildNftUrl(params: BuildNftUrlParams): string {
    if (!BlockscoutESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/token/${params.contractHash}/instance/${params.tokenId}`
  }

  getAddressTemplateUrl() {
    if (!BlockscoutESEthereum.isSupported(this.#network)) return undefined

    const baseUrl = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseUrl}/address/{address}`
  }

  getTxTemplateUrl() {
    if (!BlockscoutESEthereum.isSupported(this.#network)) return undefined

    const baseUrl = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseUrl}/tx/{txId}`
  }

  getNftTemplateUrl() {
    if (!BlockscoutESEthereum.isSupported(this.#network)) return undefined

    const baseUrl = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseUrl}/token/{hash}/instance/{tokenId}`
  }

  getContractTemplateUrl() {
    if (!BlockscoutESEthereum.isSupported(this.#network)) return undefined

    const baseUrl = BlockscoutESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseUrl}/address/{hash}`
  }
}
