import { BuildNftUrlParams, ExplorerService, Network } from '@cityofzion/blockchain-service'
import { BSEthereumNetworkId } from './BSEthereumHelper'

export class BlockscoutNeoXESEthereum implements ExplorerService {
  static BASE_URL_BY_CHAIN_ID: Partial<Record<BSEthereumNetworkId, string>> = {
    '12227332': 'https://xt4scan.ngd.network',
    '47763': 'https://xexplorer.neo.org',
  }

  static isSupported(network: Network<BSEthereumNetworkId>) {
    return !!BlockscoutNeoXESEthereum.BASE_URL_BY_CHAIN_ID[network.id]
  }

  readonly #network: Network<BSEthereumNetworkId>

  constructor(network: Network<BSEthereumNetworkId>) {
    this.#network = network
  }

  buildTransactionUrl(hash: string): string {
    if (!BlockscoutNeoXESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutNeoXESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/tx/${hash}`
  }

  buildContractUrl(contractHash: string): string {
    if (!BlockscoutNeoXESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutNeoXESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/address/${contractHash}`
  }

  buildNftUrl(params: BuildNftUrlParams): string {
    if (!BlockscoutNeoXESEthereum.isSupported(this.#network)) {
      throw new Error('Network not supported')
    }

    const baseURL = BlockscoutNeoXESEthereum.BASE_URL_BY_CHAIN_ID[this.#network.id]

    return `${baseURL}/token/${params.contractHash}/instance/${params.tokenId}`
  }
}
