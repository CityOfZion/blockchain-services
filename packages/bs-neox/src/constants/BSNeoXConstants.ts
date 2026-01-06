import { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
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

  static readonly ANTI_MEV_RPC_LIST_BY_NETWORK_ID: Record<TBSNeoXNetworkId, string[]> = {
    '47763': ['https://mainnet-5.rpc.banelabs.org'],
    '12227332': ['https://neoxt4seed5.ngd.network'],
  }

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSNeoXNetworkId, string[]> = {
    '47763': [
      ...this.ANTI_MEV_RPC_LIST_BY_NETWORK_ID['47763'],
      'https://mainnet-1.rpc.banelabs.org',
      'https://mainnet-2.rpc.banelabs.org',
      'https://mainnet-3.rpc.banelabs.org',
    ],
    '12227332': [...this.ANTI_MEV_RPC_LIST_BY_NETWORK_ID['12227332'], 'https://testnet.rpc.banelabs.org'],
  }

  static readonly MAINNET_NETWORK: TBSNetwork<TBSNeoXNetworkId> = {
    id: '47763',
    name: 'NeoX Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['47763'][0],
    type: 'mainnet',
  }

  static readonly TESTNET_NETWORK: TBSNetwork<TBSNeoXNetworkId> = {
    id: '12227332',
    name: 'NeoX Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['12227332'][0],
    type: 'testnet',
  }

  static readonly ALL_NETWORKS: TBSNetwork<TBSNeoXNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly CONSENSUS_SCRIPT_HASH = '0x1212000000000000000000000000000000000001'
  static readonly KEY_MANAGEMENT_SCRIPT_HASH = '0x1212000000000000000000000000000000000008'
  static readonly GOVERNANCE_REWARD_SCRIPT_HASH = '0x1212000000000000000000000000000000000003'
}
