import { Network, Token } from '@cityofzion/blockchain-service'

import mainnetTokens from './assets/tokens/mainnet.json'
import commonTokens from './assets/tokens/common.json'

// eslint-disable-next-line @typescript-eslint/ban-types
export type AvailableNetworkIds = 'mainnet' | 'testnet' | 'custom'

export class BSNeo3Helper {
  static #EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<AvailableNetworkIds, Token[]>> = {
    mainnet: mainnetTokens,
  }

  static #RPC_LIST_BY_NETWORK_ID: Partial<Record<AvailableNetworkIds, string[]>> = {
    mainnet: [
      'https://mainnet1.neo.coz.io:443',
      'https://mainnet4.neo.coz.io:443',
      'http://seed1.neo.org:10332',
      'http://seed2.neo.org:10332',
      'https://mainnet2.neo.coz.io:443',
      'https://mainnet5.neo.coz.io:443',
      'https://mainnet3.neo.coz.io:443',
      'https://rpc10.n3.nspcc.ru:10331',
      'https://neo1-nodes.ghostmarket.io:443',
    ],
    testnet: [
      'https://testnet1.neo.coz.io:443',
      'https://testnet2.neo.coz.io:443',
      'https://rpc.t5.n3.nspcc.ru:20331',
      'http://seed1t5.neo.org:20332',
      'http://seed2t5.neo.org:20332',
      'http://seed3t5.neo.org:20332',
      'http://seed4t5.neo.org:20332',
      'http://seed5t5.neo.org:20332',
    ],
  }

  static MAINNET_NETWORK_IDS: AvailableNetworkIds[] = ['mainnet']
  static TESTNET_NETWORK_IDS: AvailableNetworkIds[] = ['testnet']
  static ALL_NETWORK_IDS: AvailableNetworkIds[] = [...this.MAINNET_NETWORK_IDS, ...this.TESTNET_NETWORK_IDS]

  static MAINNET_NETWORKS: Network<AvailableNetworkIds>[] = [
    {
      id: 'mainnet',
      name: 'Mainnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    },
  ]
  static TESTNET_NETWORKS: Network<AvailableNetworkIds>[] = [
    {
      id: 'testnet',
      name: 'Testnet',
      url: this.#RPC_LIST_BY_NETWORK_ID['testnet']![0],
    },
  ]
  static ALL_NETWORKS: Network<AvailableNetworkIds>[] = [...this.MAINNET_NETWORKS, ...this.TESTNET_NETWORKS]

  static DEFAULT_NETWORK = this.MAINNET_NETWORKS[0]

  static NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

  static DERIVATION_PATH = "m/44'/888'/0'/0/?"

  static getTokens(network: Network<AvailableNetworkIds>) {
    const extraTokens = this.#EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return [...extraTokens, ...commonTokens]
  }

  static getRpcList(network: Network<AvailableNetworkIds>) {
    return this.#RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }
}
