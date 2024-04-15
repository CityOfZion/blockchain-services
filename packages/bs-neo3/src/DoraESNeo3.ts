import { ExplorerService, NetworkType, BuildNftUrlParams } from '@cityofzion/blockchain-service'

export class DoraESNeo3 implements ExplorerService {
  readonly #networkType: NetworkType

  constructor(networkType: NetworkType) {
    this.#networkType = networkType
  }

  buildTransactionUrl(hash: string): string {
    if (this.#networkType === 'custom') throw new Error('DoraESNeo3 does not support custom network')
    return `https://dora.coz.io/transaction/neo3/${this.#networkType}/${hash}`
  }

  buildNftUrl({ contractHash, tokenId }: BuildNftUrlParams): string {
    if (this.#networkType === 'custom') throw new Error('DoraESNeo3 does not support custom network')
    return `https://dora.coz.io/nft/neo3/${this.#networkType}/${contractHash}/${tokenId}`
  }
}
