import { TBSNetwork, TBSToken } from '@cityofzion/blockchain-service'
import { TBSNeo3NetworkId } from '../types'

export class BSNeo3Constants {
  static readonly EXTRA_TOKENS_BY_NETWORK_ID: Partial<Record<TBSNeo3NetworkId, TBSToken[]>> = {
    mainnet: [
      {
        symbol: 'LRB',
        name: 'LyrebirdToken',
        hash: '0x8c07b4c9f5bc170a3922eac4f5bb7ef17b0acc8b',
        decimals: 8,
      },
      {
        symbol: 'USDL',
        name: 'LyrebirdUSDToken',
        hash: '0xa8c51aa0c177187aeed3db88bdfa908ccbc9b1a5',
        decimals: 8,
      },
      {
        symbol: 'FLM',
        name: 'FLM',
        hash: '0xf0151f528127558851b39c2cd8aa47da7418ab28',
        decimals: 8,
      },
      {
        symbol: 'CAKE',
        hash: '0x570c27653683788177f05740257d88fed76bf74b',
        decimals: 18,
        name: 'CAKE',
      },
      {
        symbol: 'fCAKE',
        name: 'fCAKE',
        hash: '0xe65b462b90516012826f8a9c4c285d8c750e3a77',
        decimals: 18,
      },
      {
        symbol: 'WING',
        name: 'WING',
        hash: '0x948a60635d1f7921063d04be8f6cb35c741df566',
        decimals: 9,
      },
      {
        symbol: 'pWING',
        hash: '0xeeccd60ed722111f8400434dac3ba42c14d8beb1',
        decimals: 9,
        name: 'pWING',
      },
      {
        symbol: 'WETH',
        hash: '0xd3a41b53888a733b549f5d4146e7a98d3285fa21',
        decimals: 18,
        name: 'WETH',
      },
      {
        symbol: 'fWETH',
        name: 'fWETH',
        hash: '0xc14b601252aa5dfa6166cf35fe5ccd2e35f3fdf5',
        decimals: 18,
      },
      {
        symbol: 'WBTC',
        hash: '0x4548a3bcb3c2b5ce42bf0559b1cf2f1ec97a51d0',
        decimals: 8,
        name: 'WBTC',
      },
      {
        symbol: 'fWBTC',
        name: 'fWBTC',
        hash: '0xd6abe115ecb75e1fa0b42f5e85934ce8c1ae2893',
        decimals: 8,
      },
      {
        symbol: 'SWTH',
        name: 'SWTHToken',
        hash: '0x78e1330db47634afdb5ea455302ba2d12b8d549f',
        decimals: 8,
      },
      {
        symbol: 'ONT',
        hash: '0x0a1328bffb804ad7bb342673da82a972cc7af86c',
        decimals: 9,
        name: 'ONT',
      },
      {
        symbol: 'pONT',
        name: 'pONT',
        hash: '0x8122bc2212ec971690a044b37a6f52a9349b702b',
        decimals: 9,
      },
      {
        symbol: 'USDT',
        name: 'USDT',
        hash: '0x68b938cc42b6a2d54fb9040f5facf4290ebb8c5f',
        decimals: 6,
      },
      {
        symbol: 'fUSDT',
        name: 'fUSDT',
        hash: '0xcd48b160c1bbc9d74997b803b9a7ad50a4bef020',
        decimals: 6,
      },
      {
        symbol: 'FLUND',
        name: 'FLUND',
        hash: '0xa9603a59e21d29e37ac39cf1b5f5abf5006b22a3',
        decimals: 8,
      },
      {
        symbol: 'GM',
        name: 'GhostMarketToken',
        hash: '0x9b049f1283515eef1d3f6ac610e1595ed25ca3e9',
        decimals: 8,
      },
      {
        symbol: 'TIPS',
        name: 'TIPS',
        hash: '0x340720c7107ef5721e44ed2ea8e314cce5c130fa',
        decimals: 8,
      },
      {
        symbol: 'CANDY',
        name: 'NeoCandy',
        hash: '0x88da18a5bca86ec8206d9b4960a7d0c4355a432f',
        decimals: 9,
      },
      {
        symbol: 'DOGER',
        name: 'DogeRift',
        hash: '0x322b5a366ca724801a1aa01e669b5f3d7f8c7f6f',
        decimals: 8,
      },
      {
        symbol: 'DOGEF',
        name: 'DogeFood',
        hash: '0xa3291b66f70d4687fc0e41977d8acb0699f235ae',
        decimals: 8,
      },
      {
        symbol: 'SOM',
        name: 'Som',
        hash: '0x2d4c6cf0417209a7eb410160344e224e74f87195',
        decimals: 8,
      },
      {
        symbol: 'LAMBO',
        name: 'BoomerFund',
        hash: '0xafdd6abedf066ff8c5fbc868cc89f80eac467142',
        decimals: 8,
      },
      {
        symbol: 'bNEO',
        hash: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
        decimals: 8,
        name: 'BurgerNEO',
      },
      {
        symbol: 'BNB',
        hash: '0x00fb9575f220727f71a1537f75e83af9387628ff',
        decimals: 18,
        name: 'BNB',
      },
      {
        symbol: 'fBNB',
        hash: '0xb56f0fba45cc57a948b342186274dfd863996bb3',
        decimals: 18,
        name: 'fBNB',
      },
      {
        symbol: 'FUSD',
        hash: '0x1005d400bcc2a56b7352f09e273be3f9933a5fb1',
        decimals: 8,
        name: 'FUSD',
      },
      {
        symbol: 'FDE',
        hash: '0x9770f4d78a19d1a6fa94b472bcedffcc06b56c49',
        decimals: 8,
        name: 'FDE',
      },
      {
        symbol: 'Hood',
        hash: '0xc8d56cac2dd82e2da605ccae6865a99da491b97e',
        decimals: 8,
        name: 'RobinHood',
      },
      {
        symbol: 'HD',
        hash: '0x4b027a8320d5705802e5efbb51f6231ebf412cf6',
        decimals: 8,
        name: 'The Hongfei',
      },
      {
        symbol: 'NRP',
        hash: '0x789518aa302b571e3e825f2c85a01ad731014a45',
        decimals: 8,
        name: 'NeoRedPill',
      },
    ],
  }

  static readonly GAS_TOKEN: TBSToken = {
    symbol: 'GAS',
    name: 'GAS',
    hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
    decimals: 8,
  }

  static readonly NEO_TOKEN: TBSToken = {
    symbol: 'NEO',
    name: 'NEO',
    hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
    decimals: 0,
  }

  static readonly NATIVE_ASSETS: TBSToken[] = [BSNeo3Constants.GAS_TOKEN, BSNeo3Constants.NEO_TOKEN]

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

  static readonly MAINNET_NETWORK: TBSNetwork<TBSNeo3NetworkId> = {
    id: 'mainnet',
    name: 'Mainnet',
    url: this.RPC_LIST_BY_NETWORK_ID['mainnet']![0],
    type: 'mainnet',
  }
  static readonly TESTNET_NETWORK: TBSNetwork<TBSNeo3NetworkId> = {
    id: 'testnet',
    name: 'Testnet',
    url: this.RPC_LIST_BY_NETWORK_ID['testnet']![0],
    type: 'testnet',
  }
  static readonly ALL_NETWORKS = [this.MAINNET_NETWORK, this.TESTNET_NETWORK]

  static readonly NEO_NS_HASH = '0x50ac1c37690cc2cfc594472833cf57505d5f46de'

  static readonly DEFAULT_BIP44_DERIVATION_PATH = "m/44'/888'/0'/0/?"
}
