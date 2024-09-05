import { Token } from '@cityofzion/blockchain-service'
import BigNumber from 'bignumber.js'
import { BSNeo3NetworkId } from './BSNeo3Constants'

export type FlamingoSwapScriptHashes = {
  flamingoSwapRouter: string
  flamingoPairWhiteList: string
  flamingoFactory: string
}

export type FlamingoSwapPoolInfo = {
  symbol: string
  decimals: number
  hash: string
  tokens: Token[]
}

export type FlamingoSwapPools = {
  [key: string]: FlamingoSwapPoolInfo
}

export type FlamingoSwapTokens = {
  [key: string]: Token
}

export const BLOCKCHAIN_WSS_URL = 'wss://rpc10.n3.nspcc.ru:10331/ws'

export class FlamingoSwapConstants {
  static readonly BN_0 = new BigNumber(0)

  static readonly BN_1 = new BigNumber(1)

  static readonly BN_997 = new BigNumber(997)

  static readonly BN_1000 = new BigNumber(1000)

  static readonly FEE_RATE = new BigNumber(0.003)

  static readonly GAS_PER_NEO = 0.001

  static readonly TESTNET_FLAMINGO_SWAP_TOKENS: FlamingoSwapTokens = {
    // ============ Neo Assets ============ //
    FLM: {
      symbol: 'FLM',
      decimals: 8,
      hash: '0x5b53998b399d10cd25727269e865acc785ef5c1a',
      name: 'FLM',
    },
    TIPS: {
      symbol: 'TIPS',
      decimals: 8,
      hash: '0xe2cd0c441f37f0daeeee196b5ce23bef4182c43a',
      name: 'TIPS',
    },
    CANDY: {
      symbol: 'CANDY',
      decimals: 9,
      hash: '0x7d4515866a633857c0ca5798aa66856768ae06fe',
      name: 'CANDY',
    },
    DOGER: {
      symbol: 'DOGER',
      decimals: 8,
      hash: '0x7761e3b1939f691feb01d791c4c2307bd195e9e5',
      name: 'DOGER',
    },
    DOGEF: {
      symbol: 'DOGEF',
      decimals: 8,
      hash: '0x1379ebf3c7f42c34bee4c3320d23ce47a8b17ed4',
      name: 'DOGEF',
    },
    NEO: {
      symbol: 'NEO',
      decimals: 0,
      hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      name: 'NEO',
    },
    GAS: {
      symbol: 'GAS',
      decimals: 8,
      hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      name: 'GAS',
    },
    bNEO: {
      symbol: 'bNEO',
      decimals: 8,
      hash: '0x85deac50febfd93988d3f391dea54e8289e43e9e',
      name: 'bNEO',
    },
    SWTH: {
      symbol: 'SWTH',
      decimals: 8,
      hash: '0x70aba30ba83c344fa8c8d65939c93ca12e8c7409',
      name: 'SWTH',
    },
    GM: {
      symbol: 'GM',
      decimals: 8,
      hash: '0xc13b05fc0e6fe3cc681e29a574557784b4f79aff',
      name: 'GM',
    },
    fUSDT: {
      symbol: 'fUSDT',
      decimals: 6,
      hash: '0xa2d5f4378c42d118ebc7e1690f9478d3e00aefa1',
      name: 'fUSDT',
    },
    fWETH: {
      symbol: 'fWETH',
      decimals: 18,
      hash: '0xe6d9306f944df543bc0171558d06e39fc548ad08',
      name: 'fWETH',
    },
    fWBTC: {
      symbol: 'fWBTC',
      decimals: 8,
      hash: '0x9b9f7db02c0a2d6aa5ad9be7bba843027bf5b5f2',
      name: 'fWBTC',
    },
    pONT: {
      symbol: 'pONT',
      decimals: 9,
      hash: '0xdaedcb8316bebd0fd278ec9c85766caba3232cfc',
      name: 'pONT',
    },
    pWING: {
      symbol: 'pWING',
      decimals: 9,
      hash: '0x44e38f5602b130bc669074c3f938c607448498b2',
      name: 'pWING',
    },
    fCAKE: {
      symbol: 'fCAKE',
      decimals: 18,
      hash: '0x1667501ddf75e801360d617232c3e9f7958f1962',
      name: 'fCAKE',
    },
    SOM: {
      symbol: 'SOM',
      decimals: 8,
      hash: '0xfc7b372524289bc83f97647011698cb3325e8d9d',
      name: 'SOM',
    },
    FDE: {
      symbol: 'FDE',
      decimals: 8,
      hash: '0x5b769ec16f521711d7246c17ac107f7269bf56da',
      name: 'FDE',
    },
    fBNB: {
      symbol: 'fBNB',
      decimals: 18,
      hash: '0x1883231a31dc912805cc08a281d4c268c4cac345',
      name: 'fBNB',
    },
  } as const

  static readonly MAINNET_FLAMINGO_SWAP_TOKENS: FlamingoSwapTokens = {
    // ============ Neo Assets ============ //
    FLM: {
      symbol: 'FLM',
      decimals: 8,
      hash: '0xf0151f528127558851b39c2cd8aa47da7418ab28',
      name: 'FLM',
    },
    TIPS: {
      symbol: 'TIPS',
      decimals: 8,
      hash: '0x340720c7107ef5721e44ed2ea8e314cce5c130fa',
      name: 'TIPS',
    },
    NEO: {
      symbol: 'NEO',
      decimals: 0,
      hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      name: 'NEO',
    },
    GAS: {
      symbol: 'GAS',
      decimals: 8,
      hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      name: 'GAS',
    },
    bNEO: {
      symbol: 'bNEO',
      decimals: 8,
      hash: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
      name: 'bNEO',
    },
    FUSD: {
      symbol: 'FUSD',
      decimals: 8,
      hash: '0x1005d400bcc2a56b7352f09e273be3f9933a5fb1',
      name: 'FUSD',
    },
    LRB: {
      symbol: 'LRB',
      decimals: 8,
      hash: '0x8c07b4c9f5bc170a3922eac4f5bb7ef17b0acc8b',
      name: 'LRB',
    },
    USDL: {
      symbol: 'USDL',
      decimals: 8,
      hash: '0xa8c51aa0c177187aeed3db88bdfa908ccbc9b1a5',
      name: 'USDL',
    },
    SOM: {
      symbol: 'SOM',
      decimals: 8,
      hash: '0x2d4c6cf0417209a7eb410160344e224e74f87195',
      name: 'SOM',
    },
    CANDY: {
      symbol: 'CANDY',
      decimals: 9,
      hash: '0x88da18a5bca86ec8206d9b4960a7d0c4355a432f',
      name: 'CANDY',
    },
    DOGER: {
      symbol: 'DOGER',
      decimals: 8,
      hash: '0x322b5a366ca724801a1aa01e669b5f3d7f8c7f6f',
      name: 'DOGER',
    },
    DOGEF: {
      symbol: 'DOGEF',
      decimals: 8,
      hash: '0xa3291b66f70d4687fc0e41977d8acb0699f235ae',
      name: 'DOGEF',
    },
    FDE: {
      symbol: 'FDE',
      decimals: 8,
      hash: '0x9770f4d78a19d1a6fa94b472bcedffcc06b56c49',
      name: 'FDE',
    },
    fUSDT: {
      symbol: 'fUSDT',
      decimals: 6,
      hash: '0xcd48b160c1bbc9d74997b803b9a7ad50a4bef020',
      name: 'fUSDT',
    },
    fWETH: {
      symbol: 'fWETH',
      decimals: 18,
      hash: '0xc14b601252aa5dfa6166cf35fe5ccd2e35f3fdf5',
      name: 'fWETH',
    },
    fWBTC: {
      symbol: 'fWBTC',
      decimals: 8,
      hash: '0xd6abe115ecb75e1fa0b42f5e85934ce8c1ae2893',
      name: 'fWBTC',
    },
    pONT: {
      symbol: 'pONT',
      decimals: 9,
      hash: '0x8122bc2212ec971690a044b37a6f52a9349b702b',
      name: 'pONT',
    },
    pWING: {
      symbol: 'pWING',
      decimals: 9,
      hash: '0xeeccd60ed722111f8400434dac3ba42c14d8beb1',
      name: 'pWING',
    },
    GM: {
      symbol: 'GM',
      decimals: 8,
      hash: '0x9b049f1283515eef1d3f6ac610e1595ed25ca3e9',
      name: 'GM',
    },
    fCAKE: {
      symbol: 'fCAKE',
      decimals: 18,
      hash: '0xe65b462b90516012826f8a9c4c285d8c750e3a77',
      name: 'fCAKE',
    },
    SWTH: {
      symbol: 'SWTH',
      decimals: 8,
      hash: '0x78e1330db47634afdb5ea455302ba2d12b8d549f',
      name: 'SWTH',
    },
    fBNB: {
      symbol: 'fBNB',
      decimals: 18,
      hash: '0xb56f0fba45cc57a948b342186274dfd863996bb3',
      name: 'fBNB',
    },
  } as const

  static readonly FLAMINGO_SWAP_TOKENS: Record<BSNeo3NetworkId, FlamingoSwapTokens> = {
    testnet: this.TESTNET_FLAMINGO_SWAP_TOKENS,
    mainnet: this.MAINNET_FLAMINGO_SWAP_TOKENS,
  }

  static readonly FLAMINGO_SWAP_SCRIPT_HASHES: Partial<Record<BSNeo3NetworkId, FlamingoSwapScriptHashes>> = {
    mainnet: {
      flamingoSwapRouter: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
      flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
      flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
    },
    testnet: {
      flamingoSwapRouter: '0x6f0910fa26290f4a423930c8f833395790c71705',
      flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
      flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
    },
  }

  static readonly TESTNET_FLAMINGO_SWAP_POOLS: FlamingoSwapPools = {
    'FLP-FLM-bNEO': {
      symbol: 'FLP-FLM-bNEO',
      decimals: 8,
      hash: '0x35f47f3f697aaadfec954d5936d67f172413de7e',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-FLM-fUSDT': {
      symbol: 'FLP-FLM-fUSDT',
      decimals: 8,
      hash: '0x5510e648a00fea8966025c8b4b1c618cfa363ad1',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.fUSDT],
    },
    'FLP-FLM-fWBTC': {
      symbol: 'FLP-FLM-fWBTC',
      decimals: 8,
      hash: '0xd11716dc3fce15790177bd6d4a827e3d00255118',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.fWBTC],
    },
    'FLP-FLM-fWETH': {
      symbol: 'FLP-FLM-fWETH',
      decimals: 8,
      hash: '0xf9ee43c25f23fd42a1d6d199ef87ebe953bec325',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.fWETH],
    },
    'FLP-FLM-GAS': {
      symbol: 'FLP-FLM-GAS',
      decimals: 8,
      hash: '0x7deb6406aeef3414ae47ae34fd986d0ca2c92859',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.GAS],
    },
    'FLP-FLM-BNB': {
      symbol: 'FLP-FLM-BNB',
      decimals: 8,
      hash: '0xa89606941d015c1f5a14939198a0bf56399b560e',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fBNB, this.FLAMINGO_SWAP_TOKENS.testnet.FLM],
    },
    'FLP-FLM-pONT': {
      symbol: 'FLP-FLM-pONT',
      decimals: 8,
      hash: '0xfe2984756a526fb1405d69d72676a42a9edf3650',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.pONT],
    },
    'FLP-FLM-WING': {
      symbol: 'FLP-FLM-WING',
      decimals: 8,
      hash: '0xe9401a22ee998748012b249cae7fd84006889cf1',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.pWING, this.FLAMINGO_SWAP_TOKENS.testnet.FLM],
    },
    'FLP-FLM-GM': {
      symbol: 'FLP-FLM-GM',
      decimals: 8,
      hash: '0x635d478af99bef6cc53920836ec539e569907c8b',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.GM],
    },
    'FLP-FLM-fCAKE': {
      symbol: 'FLP-FLM-fCAKE',
      decimals: 8,
      hash: '0x3f4b2425b704ac587632cab04b8e2db4bcfab911',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fCAKE, this.FLAMINGO_SWAP_TOKENS.testnet.FLM],
    },
    'FLP-FLM-SWTH': {
      symbol: 'FLP-FLM-SWTH',
      decimals: 8,
      hash: '0xc7f02273b619ef4b20f81e9ec41becc86f645b3d',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.SWTH],
    },
    'FLP-bNEO-fUSDT': {
      symbol: 'FLP-bNEO-fUSDT',
      decimals: 8,
      hash: '0x7d835604b4b9e58baabe26f32a43fb977b568fc7',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.fUSDT],
    },
    'FLP-bNEO-fWBTC': {
      symbol: 'FLP-bNEO-fWBTC',
      decimals: 8,
      hash: '0x8e71d7dab87a6ad6279d0385096307fe17038282',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.fWBTC],
    },
    'FLP-bNEO-fWETH': {
      symbol: 'FLP-bNEO-fWETH',
      decimals: 8,
      hash: '0xa9cdf0e61bb6d38390b974628e40a10cd22babcf',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.fWETH],
    },
    'FLP-bNEO-GAS': {
      symbol: 'FLP-bNEO-GAS',
      decimals: 8,
      hash: '0x5a262ceef47ffcb82bfd3d94b916a2573e503e5a',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.GAS],
    },
    'FLP-bNEO-BNB': {
      symbol: 'FLP-bNEO-BNB',
      decimals: 8,
      hash: '0x1bcd02c98802365aa6722bc552fbdcae4397c17e',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fBNB, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-bNEO-pONT': {
      symbol: 'FLP-bNEO-pONT',
      decimals: 8,
      hash: '0xcce0827f42ea56cbc9514e4e9e60589dbbc37869',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.pONT],
    },
    'FLP-bNEO-WING': {
      symbol: 'FLP-bNEO-WING',
      decimals: 8,
      hash: '0x2ad51e9fef7f52fa60070cf3379a5b9170d76249',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.pWING, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-bNEO-GM': {
      symbol: 'FLP-bNEO-GM',
      decimals: 8,
      hash: '0xa83cc212789b7ec6c0ccffe109bc71413eefe3e1',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.GM],
    },
    'FLP-bNEO-fCAKE': {
      symbol: 'FLP-bNEO-fCAKE',
      decimals: 8,
      hash: '0x3c7ae4f37c9ebf54536f9ce15cfd4359f6ea6ba1',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fCAKE, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-bNEO-SWTH': {
      symbol: 'FLP-bNEO-SWTH',
      decimals: 8,
      hash: '0x13e2a229e27f2aa567ad9fd5a1958a32691d18fc',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.SWTH, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-fWBTC-fUSDT': {
      symbol: 'FLP-fWBTC-fUSDT',
      decimals: 8,
      hash: '0x7d71812d091d564d9604388787a65ec8e4d42a69',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fWBTC, this.FLAMINGO_SWAP_TOKENS.testnet.fUSDT],
    },
    'FRP-FLM-FDE': {
      symbol: 'FRP-FLM-FDE',
      decimals: 8,
      hash: '0x4d30c0ab3d908126133813fb40cb153caf78d17d',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.FDE],
    },
    'FRP-bNEO-FDE': {
      symbol: 'FRP-bNEO-FDE',
      decimals: 8,
      hash: '0xaa4a2c7e9f5ddd2e6bfafc36d4b74e9ee171c6ae',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FDE, this.FLAMINGO_SWAP_TOKENS.testnet.bNEO],
    },
    'FLP-FLM-FUSD': {
      symbol: 'FLP-FLM-FUSD',
      decimals: 8,
      hash: '0x5d64cf72fa1d72aa6983218c2b286b136e05657e',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.FLM, this.FLAMINGO_SWAP_TOKENS.testnet.FUSD],
    },
    'FLP-fWBTC-FUSD': {
      symbol: 'FLP-fWBTC-FUSD',
      decimals: 8,
      hash: '0x839a33a0326700d8dbd8621f95044fee29c3a643',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fWBTC, this.FLAMINGO_SWAP_TOKENS.testnet.FUSD],
    },
    'FLP-bNEO-FUSD': {
      symbol: 'FLP-bNEO-FUSD',
      decimals: 8,
      hash: '0x9ed3e179fb8f68d255bae6708c42fc66e32df566',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.bNEO, this.FLAMINGO_SWAP_TOKENS.testnet.FUSD],
    },
    'FLP-fUSDT-FUSD': {
      symbol: 'FLP-fUSDT-FUSD',
      decimals: 8,
      hash: '0x654d926c89aea73815131668904f08b2d5d1ac95',
      tokens: [this.FLAMINGO_SWAP_TOKENS.testnet.fUSDT, this.FLAMINGO_SWAP_TOKENS.testnet.FUSD],
    },
  }

  static readonly MAINNET_FLAMINGO_SWAP_POOLS: FlamingoSwapPools = {
    'FLP-FLM-bNEO': {
      symbol: 'FLP-FLM-bNEO',
      decimals: 8,
      hash: '0x4d5a85b0c83777df72cfb665a933970e4e20c0ec',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-fUSDT': {
      symbol: 'FLP-FLM-fUSDT',
      decimals: 8,
      hash: '0x59aa80468a120fe79aa5601de07746275c9ed76a',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fUSDT, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-fWBTC': {
      symbol: 'FLP-FLM-fWBTC',
      decimals: 8,
      hash: '0x6bcbf09a7193c968d608178a45785967f0721c42',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fWBTC, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-fWETH': {
      symbol: 'FLP-FLM-fWETH',
      decimals: 8,
      hash: '0x1404929a660620869c9cb46ff228ee9d7147959d',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fWETH, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-GAS': {
      symbol: 'FLP-FLM-GAS',
      decimals: 8,
      hash: '0x171d791c0301c332cfe95c6371ee32965e34b606',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.GAS, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-fBNB': {
      symbol: 'FLP-FLM-fBNB',
      decimals: 8,
      hash: '0x186998775b3dfb81eb878030cb49cc1eeeed5bfc',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fBNB, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-pONT': {
      symbol: 'FLP-FLM-pONT',
      decimals: 8,
      hash: '0x1b3f740240af479f07e44ee3ee78df4c6cb4b1fb',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.pONT, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-WING': {
      symbol: 'FLP-FLM-WING',
      decimals: 8,
      hash: '0x576f42660a266141f03972f96992f2c1c10253a0',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.pWING, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-GM': {
      symbol: 'FLP-FLM-GM',
      decimals: 8,
      hash: '0xf23221a92c29beffbea6e46c681c8380d9794579',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.GM, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-fCAKE': {
      symbol: 'FLP-FLM-fCAKE',
      decimals: 8,
      hash: '0x236a6679dc26b5f11fae7c3b30784509216dd4b0',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fCAKE, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-SWTH': {
      symbol: 'FLP-FLM-SWTH',
      decimals: 8,
      hash: '0xd8788aab4f7d84384f1808f9aaacd5dc4ea94317',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.SWTH, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-bNEO-fUSDT': {
      symbol: 'FLP-bNEO-fUSDT',
      decimals: 8,
      hash: '0x545dee8354823d1bdf4ac524e4092f7405025247',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.fUSDT],
    },
    'FLP-bNEO-fWBTC': {
      symbol: 'FLP-bNEO-fWBTC',
      decimals: 8,
      hash: '0xc777a8032c1d9d7b885c7357d4c93e7a39f93942',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.fWBTC],
    },
    'FLP-bNEO-fWETH': {
      symbol: 'FLP-bNEO-fWETH',
      decimals: 8,
      hash: '0xedcbe55b04bcc7dad69cfe243bf3d26dc106a1d4',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.fWETH],
    },
    'FLP-bNEO-GAS': {
      symbol: 'FLP-bNEO-GAS',
      decimals: 8,
      hash: '0x3244fcadcccff190c329f7b3083e4da2af60fbce',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.GAS],
    },
    'FLP-bNEO-fBNB': {
      symbol: 'FLP-bNEO-fBNB',
      decimals: 8,
      hash: '0xa1cd71d503bc8a7666c015f3e943deb2fc4c37e0',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.fBNB],
    },
    'FLP-bNEO-pONT': {
      symbol: 'FLP-bNEO-pONT',
      decimals: 8,
      hash: '0x267f98a017f3905ffc996555632c77eae701d1ca',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.pONT],
    },
    'FLP-bNEO-WING': {
      symbol: 'FLP-bNEO-WING',
      decimals: 8,
      hash: '0xff3cf71518e7f5a72b3862fa13fe9555c5899930',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.pWING],
    },
    'FLP-bNEO-GM': {
      symbol: 'FLP-bNEO-GM',
      decimals: 8,
      hash: '0xc658095f498dd3e00292c29ac1e85fe9ff206f28',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.GM],
    },
    'FLP-bNEO-fCAKE': {
      symbol: 'FLP-bNEO-fCAKE',
      decimals: 8,
      hash: '0xf3a258c98f437cc40d2b9f75f87790df8a9ab646',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.fCAKE],
    },
    'FLP-bNEO-SWTH': {
      symbol: 'FLP-bNEO-SWTH',
      decimals: 8,
      hash: '0x48d8b2b02b960aa8845a3f90d2c590d4e61a425c',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.SWTH],
    },
    'FLP-fWBTC-fUSDT': {
      symbol: 'FLP-fWBTC-fUSDT',
      decimals: 8,
      hash: '0x45d182227b5d753c7f358594b631838b92caf409',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.fUSDT, this.FLAMINGO_SWAP_TOKENS.mainnet.fWBTC],
    },
    'FRP-FLM-FDE': {
      symbol: 'FRP-FLM-FDE',
      decimals: 8,
      hash: '0x9f193ba476c934dd8847df26684063b2987b7508',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.FDE, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-TIPS': {
      symbol: 'FRP-FLM-TIPS',
      decimals: 8,
      hash: '0x35de27f4d7bc356c9a4b734cabb38cc63657233f',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.TIPS, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-CANDY': {
      symbol: 'FRP-FLM-CANDY',
      decimals: 8,
      hash: '0xf9956798ca7e8274f7ab4f1f6d6c06f55a0a9bd3',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.CANDY, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-DOGEF': {
      symbol: 'FRP-FLM-DOGEF',
      decimals: 8,
      hash: '0x5d8545d1780190e1bf7605713c901b197bcfaf11',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.DOGEF, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-DOGER': {
      symbol: 'FRP-FLM-DOGER',
      decimals: 8,
      hash: '0xb3fb4160534d8c366c06d31fc8df7bc2b3428785',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.DOGER, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-SOM': {
      symbol: 'FRP-FLM-SOM',
      decimals: 8,
      hash: '0x360dc86df056598a492f26baec4db38fcef65477',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.SOM, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-bNEO-FDE': {
      symbol: 'FRP-bNEO-FDE',
      decimals: 8,
      hash: '0x77994db5591ff4869d72fa31ffe3ace8d6435e6d',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.FDE],
    },
    'FRP-bNEO-TIPS': {
      symbol: 'FRP-bNEO-TIPS',
      decimals: 8,
      hash: '0x85a2053d65dcbda9208e2a7cfa65a9db09a1cf11',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.TIPS, this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO],
    },
    'FRP-bNEO-CANDY': {
      symbol: 'FRP-bNEO-CANDY',
      decimals: 8,
      hash: '0x29ea009d2bfecd5f65994ed54277348fb89d3e44',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.CANDY],
    },
    'FRP-bNEO-DOGEF': {
      symbol: 'FRP-bNEO-DOGEF',
      decimals: 8,
      hash: '0xdfe7973be3335a1df558e9509fb4296997364406',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO, this.FLAMINGO_SWAP_TOKENS.mainnet.DOGEF],
    },
    'FRP-bNEO-DOGER': {
      symbol: 'FRP-bNEO-DOGER',
      decimals: 8,
      hash: '0xdfaac72e7051e6cc218a9b77f228f0758f39a990',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.DOGER, this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO],
    },
    'FRP-bNEO-SOM': {
      symbol: 'FRP-bNEO-SOM',
      decimals: 8,
      hash: '0x5faf5e07e2dc09d1315cf6a49699be3feb0377d0',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.SOM, this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO],
    },
    'FRP-FLM-LRB': {
      symbol: 'FRP-FLM-LRB',
      decimals: 8,
      hash: '0x1f86bab6d548a3bd4e9292be0937c074da78ab77',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.LRB, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FRP-FLM-USDL': {
      symbol: 'FRP-FLM-USDL',
      decimals: 8,
      hash: '0x33a1e91d8187d6f62b5b2c9847b450c90d770b32',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.USDL, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-FLM-FUSD': {
      symbol: 'FLP-FLM-FUSD',
      decimals: 8,
      hash: '0xaeae872ace15f87c117213c92c00944af789aed2',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.FUSD, this.FLAMINGO_SWAP_TOKENS.mainnet.FLM],
    },
    'FLP-bNEO-FUSD': {
      symbol: 'FLP-bNEO-FUSD',
      decimals: 8,
      hash: '0x3269ece5dc33adf17ed14be7780693f3c8b102d1',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.FUSD, this.FLAMINGO_SWAP_TOKENS.mainnet.bNEO],
    },
    'FLP-fWBTC-FUSD': {
      symbol: 'FLP-fWBTC-FUSD',
      decimals: 8,
      hash: '0xa71cb8d2ef7de0e97f28378faa401d1133452632',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.FUSD, this.FLAMINGO_SWAP_TOKENS.mainnet.fWBTC],
    },
    'FLP-fUSDT-FUSD': {
      symbol: 'FLP-fUSDT-FUSD',
      decimals: 8,
      hash: '0x20c0cdd773fe704721669870c7b33b8688aa132c',
      tokens: [this.FLAMINGO_SWAP_TOKENS.mainnet.FUSD, this.FLAMINGO_SWAP_TOKENS.mainnet.fUSDT],
    },
  }

  static readonly FLAMINGO_SWAP_POOLS: Record<BSNeo3NetworkId, FlamingoSwapPools> = {
    testnet: this.TESTNET_FLAMINGO_SWAP_POOLS,
    mainnet: this.MAINNET_FLAMINGO_SWAP_POOLS,
  }
}
