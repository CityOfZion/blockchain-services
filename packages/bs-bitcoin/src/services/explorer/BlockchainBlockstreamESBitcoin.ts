import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../../types'

export class BlockchainBlockstreamESBitcoin<N extends string> implements IExplorerService {
  readonly #mainnetExplorerUrl = 'https://blockchain.com/explorer'
  readonly #testnetExplorerUrl = 'https://blockstream.info/testnet'
  readonly #nftUrl = 'https://uniscan.cc/inscription'
  readonly #service: IBSBitcoin<N>

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
  }

  buildAddressUrl(address: string) {
    if (!address?.length) return undefined

    return this.getAddressTemplateUrl()?.replace('{address}', address)
  }

  buildTransactionUrl(hash: string) {
    if (!hash?.length) return undefined

    return this.getTxTemplateUrl()?.replace('{txId}', hash)
  }

  buildNftUrl({ tokenHash }: TBuildNftUrlParams) {
    if (!tokenHash?.length) return undefined

    return this.getNftTemplateUrl()?.replace('{tokenHash}', tokenHash)
  }

  buildContractUrl(_contractHash: string) {
    return this.getContractTemplateUrl()
  }

  getAddressTemplateUrl() {
    const { network } = this.#service

    if (network.type === 'mainnet') {
      return `${this.#mainnetExplorerUrl}/addresses/btc/{address}`
    }

    if (network.type === 'testnet') {
      return `${this.#testnetExplorerUrl}/address/{address}`
    }

    return undefined
  }

  getTxTemplateUrl() {
    const { network } = this.#service

    if (network.type === 'mainnet') {
      return `${this.#mainnetExplorerUrl}/transactions/btc/{txId}`
    }

    if (network.type === 'testnet') {
      return `${this.#testnetExplorerUrl}/tx/{txId}`
    }

    return undefined
  }

  getNftTemplateUrl() {
    if (this.#service.network.type !== 'mainnet') return undefined

    return `${this.#nftUrl}/{tokenHash}`
  }

  getContractTemplateUrl() {
    return undefined
  }
}
