import { BSEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants, BSNeoXNetworkId } from './constants/BSNeoXConstants'
import {
  GetLedgerTransport,
  IBSWithNeo3NeoXBridge,
  INeo3NeoXBridgeService,
  Network,
} from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'

export class BSNeoX<BSName extends string = string>
  extends BSEthereum<BSName, BSNeoXNetworkId>
  implements IBSWithNeo3NeoXBridge<BSName>
{
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<BSName>

  constructor(name: BSName, network?: Network<BSNeoXNetworkId>, getLedgerTransport?: GetLedgerTransport<BSName>) {
    network = network ?? BSNeoXConstants.DEFAULT_NETWORK
    super(name, network, getLedgerTransport)

    this.tokens = [BSNeoXConstants.NATIVE_ASSET]
    this.nativeTokens = [BSNeoXConstants.NATIVE_ASSET]
    this.feeToken = BSNeoXConstants.NATIVE_ASSET
  }

  setNetwork(network: Network<BSNeoXNetworkId>) {
    this.network = network

    this.nftDataService = new GhostMarketNDSNeoX(network)
    this.explorerService = new BlockscoutESNeoX(network)
    this.exchangeDataService = new FlamingoForthewinEDSNeoX(network)
    this.blockchainDataService = new BlockscoutBDSNeoX(network, this.nftDataService, this.explorerService)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
  }
}
