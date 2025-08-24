import { BuildNftUrlParams, BSCommonConstants, IExplorerService } from '@cityofzion/blockchain-service'
import { IBSNeo3 } from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class DoraESNeo3<N extends string> implements IExplorerService {
  readonly #service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    this.#service = service
  }

  buildTransactionUrl(hash: string): string {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network))
      throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${BSCommonConstants.DORA_URL}/transaction/neo3/${
      this.#service.network.id
    }/${this.#service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network))
      throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${BSCommonConstants.DORA_URL}/contract/neo3/${
      this.#service.network.id
    }/${this.#service.tokenService.normalizeHash(contractHash)}`
  }

  buildNftUrl({ collectionHash, tokenHash }: BuildNftUrlParams): string {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network))
      throw new Error('DoraESNeo3 is only available on mainnet and testnet')

    return `${BSCommonConstants.DORA_URL}/nft/neo3/${this.#service.network.id}/${collectionHash}/${tokenHash}`
  }

  getAddressTemplateUrl() {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network)) return undefined

    return `${BSCommonConstants.DORA_URL}/address/neo3/${this.#service.network.id}/{address}`
  }

  getTxTemplateUrl() {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network)) return undefined

    return `${BSCommonConstants.DORA_URL}/transaction/neo3/${this.#service.network.id}/{txId}`
  }

  getNftTemplateUrl() {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network)) return undefined

    return `${BSCommonConstants.DORA_URL}/nft/neo3/${this.#service.network.id}/{collectionHash}/{tokenHash}`
  }

  getContractTemplateUrl() {
    if (BSNeo3Helper.isCustomNetwork(this.#service.network)) return undefined

    return `${BSCommonConstants.DORA_URL}/contract/neo3/${this.#service.network.id}/{hash}`
  }
}
