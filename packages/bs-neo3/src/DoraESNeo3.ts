import { ExplorerService, BuildNftUrlParams } from '@cityofzion/blockchain-service'
import { AvailableNetworkIds } from './constants'

export class DoraESNeo3 implements ExplorerService {
  readonly #networkId: AvailableNetworkIds

  constructor(networkType: AvailableNetworkIds) {
    this.#networkId = networkType
  }

  buildTransactionUrl(hash: string): string {
    if (this.#networkId === 'custom') throw new Error('DoraESNeo3 does not support custom network')
    return `https://dora.coz.io/transaction/neo3/${this.#networkId}/${hash}`
  }

  buildNftUrl({ contractHash, tokenId }: BuildNftUrlParams): string {
    if (this.#networkId === 'custom') throw new Error('DoraESNeo3 does not support custom network')
    return `https://dora.coz.io/nft/neo3/${this.#networkId}/${contractHash}/${tokenId}`
  }
}
