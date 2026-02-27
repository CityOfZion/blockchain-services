import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../../types'

export class MempoolESBitcoin<N extends string> implements IExplorerService {
  readonly #service: IBSBitcoin<N>

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
  }

  get #explorerUrl() {
    const explorerUrl = 'https://mempool.space'
    const { network } = this.#service

    if (network.type === 'mainnet') return explorerUrl
    if (network.type === 'testnet') return `${explorerUrl}/testnet`

    return undefined
  }

  get #nftUrl() {
    const nftUrl = 'https://uniscan.cc'
    const { network } = this.#service

    if (network.type === 'mainnet') return nftUrl

    return undefined
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
    const explorerUrl = this.#explorerUrl

    if (!explorerUrl) return undefined

    return `${explorerUrl}/address/{address}`
  }

  getTxTemplateUrl() {
    const explorerUrl = this.#explorerUrl

    if (!explorerUrl) return undefined

    return `${explorerUrl}/tx/{txId}`
  }

  getNftTemplateUrl() {
    const nftUrl = this.#nftUrl

    if (!nftUrl) return undefined

    return `${nftUrl}/inscription/{tokenHash}`
  }

  getContractTemplateUrl() {
    return undefined
  }
}
