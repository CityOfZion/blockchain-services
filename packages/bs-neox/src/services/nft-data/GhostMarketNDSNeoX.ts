import { GhostMarketNDSEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXNetworkId } from '../../constants/BSNeoXConstants'
import { Network } from '@cityofzion/blockchain-service'

export class GhostMarketNDSNeoX extends GhostMarketNDSEthereum<BSNeoXNetworkId> {
  constructor(network: Network<BSNeoXNetworkId>) {
    super(network, {
      '47763': 'neox',
    })
  }
}
