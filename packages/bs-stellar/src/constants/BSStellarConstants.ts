import type { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import type { TBSStellarNetworkId } from '../types'
import * as stellarSDK from '@stellar/stellar-sdk'

export class BSStellarConstants {
  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/148'/?'"

  static readonly SAC_TOKEN_DECIMALS = 7

  static readonly NATIVE_TOKEN: TBSToken = {
    symbol: 'XLM',
    name: 'Lumens',
    decimals: this.SAC_TOKEN_DECIMALS,
    hash: '-',
  }

  static readonly RPC_LIST_BY_NETWORK_ID: Record<TBSStellarNetworkId, string[]> = {
    pubnet: ['https://soroban-rpc.mainnet.stellar.gateway.fm'],
    testnet: ['https://soroban-rpc.testnet.stellar.gateway.fm'],
  }

  static readonly MAINNET_NETWORK: TBSNetwork<TBSStellarNetworkId> = {
    id: 'pubnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID.pubnet[0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TBSNetwork<TBSStellarNetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID.testnet[0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly NETWORK_PASSPHRASE_BY_NETWORK_ID: Record<TBSStellarNetworkId, string> = {
    pubnet: stellarSDK.Networks.PUBLIC,
    testnet: stellarSDK.Networks.TESTNET,
  }

  static readonly HORIZON_URL_BY_NETWORK_ID: Record<TBSStellarNetworkId, string> = {
    pubnet: 'https://horizon.stellar.org',
    testnet: 'https://horizon-testnet.stellar.org',
  }
}
