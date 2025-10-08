import { TNetwork, TBSToken } from '@cityofzion/blockchain-service'
import { TBSNeoXNetworkId } from '../types'

export class BSNeoXConstants {
  static readonly NATIVE_ASSET: TBSToken = {
    symbol: 'GAS',
    name: 'GAS',
    decimals: 18,
    hash: '0x',
  }

  static readonly NEO_TOKEN: TBSToken = {
    name: 'NEO',
    symbol: 'NEO',
    decimals: 18,
    hash: '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f',
  }

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSNeoXNetworkId, string[]> = {
    '47763': ['https://mainnet-1.rpc.banelabs.org', 'https://mainnet-2.rpc.banelabs.org'],
    '12227332': ['https://testnet.rpc.banelabs.org', 'https://neoxt4seed1.ngd.network'],
  }

  static readonly MAINNET_NETWORK: TNetwork<TBSNeoXNetworkId> = {
    id: '47763',
    name: 'NeoX Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['47763'][0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TNetwork<TBSNeoXNetworkId> = {
    id: '12227332',
    name: 'NeoX Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['12227332'][0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS: TNetwork<TBSNeoXNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]
}
