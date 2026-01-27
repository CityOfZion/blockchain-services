import { BlockscoutESEthereum } from '@cityofzion/bs-ethereum'
import { IBSNeoX, TBSNeoXNetworkId } from '../../types'

export class BlockscoutESNeoX<N extends string> extends BlockscoutESEthereum<N, TBSNeoXNetworkId> {
  static readonly DEFAULT_BASE_URL_BY_NETWORK_ID: Record<TBSNeoXNetworkId, string> = {
    '47763': 'https://xexplorer.neo.org',
    '12227332': 'https://xt4scan.ngd.network',
  }

  constructor(service: IBSNeoX<N>) {
    super(service, BlockscoutESNeoX.DEFAULT_BASE_URL_BY_NETWORK_ID[service.network.id])
  }
}
