import { BSCommonConstants, TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import { TBSSolanaNetworkId } from '../types'

export class BSSolanaConstants {
  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/501'/?'/0'"

  static readonly NATIVE_TOKEN: TBSToken = { symbol: 'SOL', name: 'SOL', decimals: 9, hash: '-' }

  static readonly NATIVE_WRAPPED_HASH = 'So11111111111111111111111111111111111111112'

  static readonly PUBLIC_RPC_LIST_BY_NETWORK_ID: Record<TBSSolanaNetworkId, string> = {
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
  }

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSSolanaNetworkId, string[]> = {
    'mainnet-beta': [`${BSCommonConstants.COZ_API_URL}/api/v2/solana/meta/mainnet`],
    devnet: [`${BSCommonConstants.COZ_API_URL}/api/v2/solana/meta/devnet`],
  }

  static readonly MAINNET_NETWORK: TBSNetwork<TBSSolanaNetworkId> = {
    id: 'mainnet-beta',
    name: 'Mainnet Beta',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet-beta'][0],
    type: 'mainnet',
  }

  static readonly TESTNET_NETWORK: TBSNetwork<TBSSolanaNetworkId> = {
    id: 'devnet',
    name: 'Devnet',
    url: this.RPC_LIST_BY_NETWORK_ID['devnet'][0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS: TBSNetwork<TBSSolanaNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]
}
