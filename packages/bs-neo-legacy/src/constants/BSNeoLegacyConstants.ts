import mainnetTokens from '../assets/tokens/mainnet.json'
import nativeTokens from '../assets/tokens/native.json'

import { TNetwork, TBSToken } from '@cityofzion/blockchain-service'
import { TokenServiceNeoLegacy } from '../services/token/TokenServiceNeoLegacy'
import { TBSNeoLegacyNetworkId } from '../types'

export class BSNeoLegacyConstants {
  static #tokenService = new TokenServiceNeoLegacy()

  static readonly EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<TBSNeoLegacyNetworkId, TBSToken[]>> = {
    mainnet: this.#tokenService.normalizeToken(mainnetTokens),
  }

  static readonly NATIVE_ASSETS = this.#tokenService.normalizeToken(nativeTokens)

  static readonly GAS_ASSET = this.NATIVE_ASSETS.find(token => this.#tokenService.predicateBySymbol('GAS', token))!
  static readonly NEO_ASSET = this.NATIVE_ASSETS.find(token => this.#tokenService.predicateBySymbol('NEO', token))!

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

  static readonly MAINNET_NETWORK: TNetwork<TBSNeoLegacyNetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TNetwork<TBSNeoLegacyNetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['testnet']![0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS: TNetwork<TBSNeoLegacyNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

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
