import type { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import type { TBSNeoXNetworkId } from '../types'

export class BSNeoXConstants {
  static readonly NATIVE_ASSET: TBSToken = {
    symbol: 'GAS',
    name: 'GAS',
    decimals: 18,
    hash: '-',
  }

  static readonly NDMEME_TOKEN: TBSToken = {
    symbol: 'NDMEME',
    name: 'NDMEME',
    hash: '0xe816dee05cf6d0f2a57eb4c489241d8326b5d106',
    decimals: 18,
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
    '12227332': [
      ...this.ANTI_MEV_RPC_LIST_BY_NETWORK_ID['12227332'],
      'https://neoxt4seed2.ngd.network',
      'https://neoxt4seed3.ngd.network',
    ],
  }
  static readonly MAINNET_NETWORK: TBSNetwork<TBSNeoXNetworkId> = {
    id: '47763',
    name: 'Neo X Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['47763'][0],
    type: 'mainnet',
  }

  static readonly TESTNET_NETWORK: TBSNetwork<TBSNeoXNetworkId> = {
    id: '12227332',
    name: 'Neo X Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['12227332'][0],
    type: 'testnet',
  }

  static readonly ALL_NETWORKS: TBSNetwork<TBSNeoXNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly CONSENSUS_SCRIPT_HASH = '0x1212000000000000000000000000000000000001'
  static readonly KEY_MANAGEMENT_SCRIPT_HASH = '0x1212000000000000000000000000000000000008'
  static readonly GOVERNANCE_REWARD_SCRIPT_HASH = '0x1212000000000000000000000000000000000003'
}
