import mainnetTokens from '../assets/tokens/mainnet.json'
import commonTokens from '../assets/tokens/common.json'

import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'

export type BSNeoLegacyNetworkId = NetworkId<'mainnet' | 'testnet'>

export class BSNeoLegacyConstants {
  static EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<BSNeoLegacyNetworkId, Token[]>> = {
    mainnet: mainnetTokens,
  }

  static NATIVE_ASSETS = commonTokens

  static RPC_LIST_BY_NETWORK_ID: Record<BSNeoLegacyNetworkId, string[]> = {
    mainnet: [
      'https://mainnet1.neo2.coz.io:443',
      'https://mainnet2.neo2.coz.io:443',
      'https://mainnet3.neo2.coz.io:443',
      'http://seed9.ngd.network:10332',
      'http://seed1.ngd.network:10332',
      'http://seed2.ngd.network:10332',
      'http://seed3.ngd.network:10332',
      'http://seed4.ngd.network:10332',
      'http://seed5.ngd.network:10332',
    ],
    testnet: [
      'http://seed5.ngd.network:20332',
      'http://seed1.ngd.network:20332',
      'http://seed2.ngd.network:20332',
      'https://testnet1.neo2.coz.io:443',
    ],
  }

  static LEGACY_NETWORK_BY_NETWORK_ID: Record<BSNeoLegacyNetworkId, string> = {
    mainnet: 'MainNet',
    testnet: 'TestNet',
  }

  static MAINNET_NETWORK_IDS: BSNeoLegacyNetworkId[] = ['mainnet']
  static TESTNET_NETWORK_IDS: BSNeoLegacyNetworkId[] = ['testnet']
  static ALL_NETWORK_IDS: BSNeoLegacyNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<BSNeoLegacyNetworkId>[] = [
    {
      id: 'mainnet',
      name: 'Mainnet',
      url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    },
  ]
  static TESTNET_NETWORKS: Network<BSNeoLegacyNetworkId>[] = [
    {
      id: 'testnet',
      name: 'Testnet',
      url: this.RPC_LIST_BY_NETWORK_ID['testnet']![0],
    },
  ]
  static ALL_NETWORKS: Network<BSNeoLegacyNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DEFAULT_BIP44_DERIVATION_PATH = "m/44'/888'/0'/0/?"

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]

  static readonly MIGRATION_NEO3_COZ_ADDRESS = 'AaT27thuyPaqERPwERhk7QhfKrbj4xoyAV'
  static readonly MIGRATION_NEO3_COZ_FEE = 0.01 // 1%
  static readonly MIGRATION_NEO3_NEP_17_TRANSFER_FEE = 0.0112143
}
