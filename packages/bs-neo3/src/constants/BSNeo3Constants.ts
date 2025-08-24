import { TNetwork, Token } from '@cityofzion/blockchain-service'
import mainnetTokens from '../assets/tokens/mainnet.json'
import nativeTokens from '../assets/tokens/native.json'
import { TokenServiceNeo3 } from '../services/token/TokenServiceNeo3'
import { TBSNeo3NetworkId } from '../types'

export class BSNeo3Constants {
  static readonly #tokenService = new TokenServiceNeo3()

  static readonly EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<TBSNeo3NetworkId, Token[]>> = {
    mainnet: this.#tokenService.normalizeToken(mainnetTokens),
  }

  static readonly NATIVE_ASSETS: Token[] = this.#tokenService.normalizeToken(nativeTokens)

  static readonly GAS_TOKEN: Token = this.NATIVE_ASSETS.find(token => token.name === 'GAS')!
  static readonly NEO_TOKEN: Token = this.NATIVE_ASSETS.find(token => token.name === 'NEO')!

  static readonly RPC_LIST_BY_NETWORK_ID: Partial<Record<TBSNeo3NetworkId, string[]>> = {
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

  static readonly MAINNET_NETWORK: TNetwork<TBSNeo3NetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TNetwork<TBSNeo3NetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['testnet']![0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/888'/0'/0/?"
}
