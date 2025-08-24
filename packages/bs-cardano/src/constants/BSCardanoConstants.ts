import { TNetwork } from '@cityofzion/blockchain-service'
import { TBSCardanoNetworkId } from '../types'

export class BSCardanoConstants {
  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/1852'/1815'/0'/0/?"

  static readonly RPC_LIST_BY_NETWORK_ID: Partial<Record<TBSCardanoNetworkId, string[]>> = {
    mainnet: ['https://api.mainnet-beta.solana.com'],
    'pre-prod': ['https://api.devnet.solana.com'],
  }

  static readonly MAINNET_NETWORK: TNetwork<TBSCardanoNetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TNetwork<TBSCardanoNetworkId> = {
    id: 'pre-prod',
    name: 'PreProd',
    url: this.RPC_LIST_BY_NETWORK_ID['pre-prod']![0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS: TNetwork<TBSCardanoNetworkId>[] = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]
}
