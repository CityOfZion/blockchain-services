import { BuildNftUrlParams, ExplorerService, NetworkType } from '@cityofzion/blockchain-service'

export class DoraESNeoLegacy implements ExplorerService {
  private networkType: NetworkType

  constructor(networkType: NetworkType) {
    this.networkType = networkType
  }

  buildTransactionUrl(hash: string): string {
    if (this.networkType === 'custom') throw new Error('DoraESNeoLegacy does not support custom network')
    return `https://dora.coz.io/transaction/neo2/${this.networkType}/${hash}`
  }

  buildNftUrl(_params: BuildNftUrlParams): string {
    throw new Error('DoraESNeoLegacy does not support nft')
  }
}
