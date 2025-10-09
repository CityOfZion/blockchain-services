import { BSEthereum, TokenServiceEthereum, WalletConnectServiceEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from './constants/BSNeoXConstants'
import { BSUtilsHelper, TGetLedgerTransport, INeo3NeoXBridgeService, TBSNetwork } from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'
import { IBSNeoX, TBSNeoXNetworkId } from './types'

export class BSNeoX<N extends string = string> extends BSEthereum<N, TBSNeoXNetworkId> implements IBSNeoX<N> {
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>

  readonly defaultNetwork: TBSNetwork<TBSNeoXNetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeoXNetworkId>[]

  constructor(name: N, network?: TBSNetwork<TBSNeoXNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    super(name, undefined, undefined, getLedgerTransport)

    this.tokens = [BSNeoXConstants.NATIVE_ASSET]
    this.nativeTokens = [BSNeoXConstants.NATIVE_ASSET]
    this.feeToken = BSNeoXConstants.NATIVE_ASSET

    this.availableNetworks = BSNeoXConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoXConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  setNetwork(network: TBSNetwork<TBSNeoXNetworkId>) {
    const availableURLs = BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []

    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, availableURLs)
    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.availableNetworkURLs = availableURLs

    this.nftDataService = new GhostMarketNDSNeoX(this)
    this.explorerService = new BlockscoutESNeoX(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeoX(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new BlockscoutBDSNeoX(this)
    this.tokenService = new TokenServiceEthereum()
    this.walletConnectService = new WalletConnectServiceEthereum(this)
  }
}
