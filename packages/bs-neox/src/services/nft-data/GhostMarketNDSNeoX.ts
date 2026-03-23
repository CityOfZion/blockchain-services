import { GhostMarketNDSEthereum } from '@cityofzion/bs-ethereum'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId } from '../../types'

export class GhostMarketNDSNeoX extends GhostMarketNDSEthereum<TBSNeoXName, TBSNeoXNetworkId> {
  static readonly CHAIN_BY_NETWORK_ID: Partial<Record<TBSNeoXNetworkId, string>> = {
    '47763': 'neox',
  }

  constructor(service: IBSNeoX) {
    super(service)
  }

  getChain(): string {
    const chain = GhostMarketNDSNeoX.CHAIN_BY_NETWORK_ID[this._service.network.id]
    if (!chain) throw new Error('Network not supported')
    return chain
  }
}
