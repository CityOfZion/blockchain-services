import { Network } from '@cityofzion/blockchain-service'
import { BlockscoutESEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXNetworkId } from '../../constants/BSNeoXConstants'

export class BlockscoutESNeoX extends BlockscoutESEthereum<BSNeoXNetworkId> {
  constructor(network: Network<BSNeoXNetworkId>) {
    super(network, {
      '47763': 'https://xexplorer.neo.org',
      '12227332': 'https://xt4scan.ngd.network',
    })
  }
}
