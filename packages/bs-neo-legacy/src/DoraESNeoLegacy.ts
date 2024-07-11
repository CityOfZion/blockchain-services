import { BuildNftUrlParams, ExplorerService } from '@cityofzion/blockchain-service'
import { AvailableNetworkIds } from './constants'

export class DoraESNeoLegacy implements ExplorerService {
  #networkId: AvailableNetworkIds

  constructor(networkId: AvailableNetworkIds) {
    this.#networkId = networkId
  }

  buildTransactionUrl(hash: string): string {
    return `https://dora.coz.io/transaction/neo2/${this.#networkId}/${hash}`
  }

  buildNftUrl(_params: BuildNftUrlParams): string {
    throw new Error('DoraESNeoLegacy does not support nft')
  }
}
