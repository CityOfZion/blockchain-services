import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'

export type BSSolanaNetworkId = NetworkId<'mainnet-beta' | 'devnet'>

export class BSSolanaConstants {
  static DEFAULT_BIP44_DERIVATION_PATH = "m/44'/501'/?'/0'"

  static RPC_LIST_BY_NETWORK_ID: Partial<Record<BSSolanaNetworkId, string[]>> = {
    'mainnet-beta': ['https://api.mainnet-beta.solana.com'],
    devnet: ['https://api.devnet.solana.com'],
  }

  static MAINNET_NETWORK_IDS: BSSolanaNetworkId[] = ['mainnet-beta']
  static TESTNET_NETWORK_IDS: BSSolanaNetworkId[] = ['devnet']
  static ALL_NETWORK_IDS: BSSolanaNetworkId[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<BSSolanaNetworkId>[] = [
    {
      id: 'mainnet-beta',
      name: 'Mainnet Beta',
      url: this.RPC_LIST_BY_NETWORK_ID['mainnet-beta']![0],
    },
  ]
  static TESTNET_NETWORKS: Network<BSSolanaNetworkId>[] = [
    {
      id: 'devnet',
      name: 'Devnet',
      url: this.RPC_LIST_BY_NETWORK_ID['devnet']![0],
    },
  ]
  static ALL_NETWORKS: Network<BSSolanaNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]

  static NATIVE_TOKEN: Token = { symbol: 'SOL', name: 'SOL', decimals: 9, hash: '-' }

  static NATIVE_WRAPPED_HASH = 'So11111111111111111111111111111111111111112'
}
