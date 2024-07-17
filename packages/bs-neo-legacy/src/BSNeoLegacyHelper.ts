import { Network, NetworkId, Token } from '@cityofzion/blockchain-service'
import commonTokens from './assets/tokens/common.json'
import mainnetTokens from './assets/tokens/mainnet.json'

export type BSNeoLegacyNetworkId = NetworkId<'mainnet' | 'testnet'>

export class BSNeoLegacyHelper {
  static #EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<BSNeoLegacyNetworkId, Token[]>> = {
    mainnet: mainnetTokens,
  }

  static NATIVE_ASSETS = commonTokens

  static #RPC_LIST_BY_NETWORK_ID: Record<BSNeoLegacyNetworkId, string[]> = {
    mainnet: [
      'http://seed9.ngd.network:10332',
      'https://mainnet1.neo2.coz.io:443',
      'https://mainnet2.neo2.coz.io:443',
      'https://mainnet3.neo2.coz.io:443',
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
      url: this.#RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    },
  ]
  static TESTNET_NETWORKS: Network<BSNeoLegacyNetworkId>[] = [
    {
      id: 'testnet',
      name: 'Testnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['testnet']![0],
    },
  ]
  static ALL_NETWORKS: Network<BSNeoLegacyNetworkId>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DERIVATION_PATH = "m/44'/888'/0'/0/?"

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]

  static getLegacyNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const legacyNetwork = this.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }

  static getTokens(network: Network<BSNeoLegacyNetworkId>) {
    const extraTokens = this.#EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return [...extraTokens, ...commonTokens]
  }

  static getRpcList(network: Network<BSNeoLegacyNetworkId>) {
    return this.#RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSNeoLegacyNetworkId>) {
    return this.MAINNET_NETWORK_IDS.includes(network.id)
  }
}
