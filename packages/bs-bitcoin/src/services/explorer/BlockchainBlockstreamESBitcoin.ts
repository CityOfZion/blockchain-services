import type { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import { BSBitcoinHelper } from '../../helpers/BSBitcoinHelper'
import type { IBSBitcoin } from '../../types'

export class BlockchainBlockstreamESBitcoin<N extends string> implements IExplorerService {
  readonly #mainnetExplorerUrl = 'https://blockchain.com/explorer'
  readonly #testnetExplorerUrl = 'https://blockstream.info/testnet'
  readonly #nftUrl = 'https://uniscan.cc/inscription'
  readonly #service: IBSBitcoin<N>

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
  }

  buildTransactionUrl(hash: string) {
    if (!hash) return undefined

    if (BSBitcoinHelper.isMainnetNetwork(this.#service.network)) {
      return `${this.#mainnetExplorerUrl}/transactions/btc/${hash}`
    }

    if (BSBitcoinHelper.isTestnetNetwork(this.#service.network)) {
      return `${this.#testnetExplorerUrl}/tx/${hash}`
    }

    return undefined
  }

  buildNftUrl({ tokenHash }: TBuildNftUrlParams) {
    if (!BSBitcoinHelper.isMainnetNetwork(this.#service.network) || !tokenHash) return undefined

    return `${this.#nftUrl}/${tokenHash}`
  }

  buildContractUrl(_contractHash: string) {
    return undefined
  }

  getAddressTemplateUrl() {
    if (BSBitcoinHelper.isMainnetNetwork(this.#service.network)) {
      return `${this.#mainnetExplorerUrl}/addresses/btc/{address}`
    }

    if (BSBitcoinHelper.isTestnetNetwork(this.#service.network)) {
      return `${this.#testnetExplorerUrl}/address/{address}`
    }

    return undefined
  }

  getTxTemplateUrl() {
    if (BSBitcoinHelper.isMainnetNetwork(this.#service.network)) {
      return `${this.#mainnetExplorerUrl}/transactions/btc/{txId}`
    }

    if (BSBitcoinHelper.isTestnetNetwork(this.#service.network)) {
      return `${this.#testnetExplorerUrl}/tx/{txId}`
    }

    return undefined
  }

  getNftTemplateUrl() {
    if (!BSBitcoinHelper.isMainnetNetwork(this.#service.network)) return undefined

    return `${this.#nftUrl}/{tokenHash}`
  }

  getContractTemplateUrl() {
    return undefined
  }
}
