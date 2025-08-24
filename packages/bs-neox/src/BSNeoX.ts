import { BSEthereum, TokenServiceEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from './constants/BSNeoXConstants'
import { GetLedgerTransport, INeo3NeoXBridgeService, TNetwork } from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'
import { IBSNeoX, TBSNeoXNetworkId } from './types'

export class BSNeoX<N extends string = string> extends BSEthereum<N, TBSNeoXNetworkId> implements IBSNeoX<N> {
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>

  readonly defaultNetwork: TNetwork<TBSNeoXNetworkId>
  readonly availableNetworks: TNetwork<TBSNeoXNetworkId>[]

  constructor(name: N, network?: TNetwork<TBSNeoXNetworkId>, getLedgerTransport?: GetLedgerTransport<N>) {
    super(name, 'ethereum', network, getLedgerTransport)

    this.tokens = [BSNeoXConstants.NATIVE_ASSET]
    this.nativeTokens = [BSNeoXConstants.NATIVE_ASSET]
    this.feeToken = BSNeoXConstants.NATIVE_ASSET

    this.availableNetworks = BSNeoXConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoXConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  setNetwork(network: TNetwork<TBSNeoXNetworkId>) {
    this.network = network

    this.nftDataService = new GhostMarketNDSNeoX(this)
    this.explorerService = new BlockscoutESNeoX(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeoX(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new BlockscoutBDSNeoX(this)
    this.tokenService = new TokenServiceEthereum()
  }

  async testNetwork(network: TNetwork<TBSNeoXNetworkId>) {
    this.tokenService = new TokenServiceEthereum()
    const service = new BSNeoX(this.name, network, this.ledgerService.getLedgerTransport)
    const blockchainDataServiceClone = new BlockscoutBDSNeoX(service)

    await blockchainDataServiceClone.getBlockHeight()
  }
}
