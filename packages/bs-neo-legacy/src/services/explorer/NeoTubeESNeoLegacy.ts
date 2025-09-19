import { TBuildNftUrlParams, IExplorerService } from '@cityofzion/blockchain-service'
import { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class NeoTubeESNeoLegacy<N extends string> implements IExplorerService {
  static readonly BASE_URL: string = 'https://neo2.neotube.io'

  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  buildTransactionUrl(hash: string): string {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('NeoTube is only available on mainnet')

    return `${NeoTubeESNeoLegacy.BASE_URL}/transaction/${this.#service.tokenService.normalizeHash(hash)}`
  }

  buildContractUrl(contractHash: string): string {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network))
      throw new Error('NeoTube is only available on mainnet')

    return `${NeoTubeESNeoLegacy.BASE_URL}/asset/${this.#service.tokenService.normalizeHash(contractHash)}/page/1`
  }

  buildNftUrl(_params: TBuildNftUrlParams): string {
    throw new Error('NeoTube does not support nft')
  }

  getAddressTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network)) return undefined

    return `${NeoTubeESNeoLegacy.BASE_URL}/address/{address}`
  }

  getTxTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network)) return undefined

    return `${NeoTubeESNeoLegacy.BASE_URL}/transaction/{txId}`
  }

  getNftTemplateUrl() {
    return undefined
  }

  getContractTemplateUrl() {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network)) return undefined

    return `${NeoTubeESNeoLegacy.BASE_URL}/asset/{hash}/page/1`
  }
}
