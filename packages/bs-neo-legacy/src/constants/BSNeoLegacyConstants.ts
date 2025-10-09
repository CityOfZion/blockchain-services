import { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import { TBSNeoLegacyNetworkId } from '../types'

export class BSNeoLegacyConstants {
  static readonly GAS_ASSET: TBSToken = {
    symbol: 'GAS',
    name: 'GAS',
    hash: '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7',
    decimals: 8,
  }
  static readonly NEO_ASSET: TBSToken = {
    symbol: 'NEO',
    name: 'NEO',
    hash: '0xc56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b',
    decimals: 0,
  }
  static readonly NATIVE_ASSETS = [BSNeoLegacyConstants.NEO_ASSET, BSNeoLegacyConstants.GAS_ASSET]

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSNeoLegacyNetworkId, string[]> = {
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

  static readonly LEGACY_NETWORK_BY_NETWORK_ID: Record<TBSNeoLegacyNetworkId, string> = {
    mainnet: 'MainNet',
    testnet: 'TestNet',
  }

  static readonly MAINNET_NETWORK: TBSNetwork<TBSNeoLegacyNetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TBSNetwork<TBSNeoLegacyNetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['testnet']![0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS: TBSNetwork<TBSNeoLegacyNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/888'/0'/0/?"

  static readonly MIGRATION_COZ_LEGACY_ADDRESS = 'AaT27thuyPaqERPwERhk7QhfKrbj4xoyAV'
  static readonly MIGRATION_COZ_FEE = 0.01 // 1%
  static readonly MIGRATION_NEP_17_TRANSFER_FEE = 0.0112143
  static readonly MIGRATION_MIN_GAS = 0.1
  static readonly MIGRATION_MIN_NEO = 2
  static readonly MIGRATION_COZ_NEO3_ADDRESS = 'NLMsicDapULKFDmAzTsbhwrZjYZ83j53Ty'

  static readonly MAX_TRANSACTION_SIZE_WITHOUT_FEE = 1024
  static readonly FEE_APPLIED_TO_PLAYABLE_TRANSACTION = 0.05
}
