import { Network, SwapRoute } from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../../BSNeo3Helper'
import { FlamingoSwapHelper } from '../../flamingo-swap/FlamingoSwapHelper'
import { FlamingoSwapMultiInvoke, RoutePath } from '../../flamingo-swap/FlamingoSwapMultiInvoke'

const network: Network<BSNeo3NetworkId> = {
  name: 'mainnet',
  id: 'mainnet',
  url: 'https://mainnet1.neo.coz.io:443',
}

const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
const SWTH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH')
const FLM = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')
const FLUND = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLUND')

describe('FlamingoSwapMultiInvoke', () => {
  it('Should be able to calculate the best route for swap GAS per SWTH', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FLM,
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FLM,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: SWTH,
        reserveTokenToReceive: expect.any(String),
      },
    ]

    const response = await FlamingoSwapMultiInvoke.calculateBestRouteForSwap({
      tokenToUse: GAS,
      tokenToReceive: SWTH,
      network,
    })
    expect(response).toEqual(expectedResponse)
  })

  it.only('Should be able to calculate the best route for swap GAS per NEO', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: bNEO,
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '0',
        tokenToReceive: NEO,
        reserveTokenToReceive: '0',
      },
    ]

    const response = await FlamingoSwapMultiInvoke.calculateBestRouteForSwap({
      tokenToUse: GAS,
      tokenToReceive: NEO,
      network,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to calculate the best route for swap a token that does not have pairs', async () => {
    const expectedResponse: SwapRoute[] = []

    const response = await FlamingoSwapMultiInvoke.calculateBestRouteForSwap({
      tokenToUse: FLUND,
      tokenToReceive: SWTH,
      network,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get the shortest route path for swap GAS per SWTH', () => {
    const expectedResponse: RoutePath[] = [
      {
        tokenToUse: GAS,
        tokenToReceive: FLM,
      },
      {
        tokenToUse: FLM,
        tokenToReceive: SWTH,
      },
    ]

    const response = FlamingoSwapMultiInvoke.getShortestRoutePath(network, GAS, SWTH)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get the shortest route path for swap GAS per NEO', () => {
    const expectedResponse: RoutePath[] = [
      {
        tokenToUse: GAS,
        tokenToReceive: bNEO,
      },
      {
        tokenToUse: bNEO,
        tokenToReceive: NEO,
      },
    ]

    const response = FlamingoSwapMultiInvoke.getShortestRoutePath(network, GAS, NEO)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get the shortest route path for swap NEO per GAS', () => {
    const expectedResponse: RoutePath[] = [
      {
        tokenToUse: NEO,
        tokenToReceive: bNEO,
      },
      {
        tokenToUse: bNEO,
        tokenToReceive: GAS,
      },
    ]

    const response = FlamingoSwapMultiInvoke.getShortestRoutePath(network, NEO, GAS)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to create pool graph', () => {
    const expectedResponse = {
      FLM: [
        'bNEO',
        'fUSDT',
        'fWBTC',
        'fWETH',
        'GAS',
        'fBNB',
        'pONT',
        'pWING',
        'GM',
        'fCAKE',
        'SWTH',
        'FDE',
        'TIPS',
        'CANDY',
        'DOGEF',
        'DOGER',
        'SOM',
        'LRB',
        'USDL',
        'FUSD',
      ],
      FLUND: [],
      TIPS: ['FLM', 'bNEO'],
      NEO: ['bNEO'],
      GAS: ['FLM', 'bNEO'],
      bNEO: [
        'FLM',
        'fUSDT',
        'fWBTC',
        'fWETH',
        'GAS',
        'fBNB',
        'pONT',
        'pWING',
        'GM',
        'fCAKE',
        'SWTH',
        'FDE',
        'TIPS',
        'CANDY',
        'DOGEF',
        'DOGER',
        'SOM',
        'FUSD',
        'NEO',
      ],
      FUSD: ['FLM', 'bNEO', 'fWBTC', 'fUSDT'],
      LRB: ['FLM'],
      USDL: ['FLM'],
      SOM: ['FLM', 'bNEO'],
      CANDY: ['FLM', 'bNEO'],
      DOGER: ['FLM', 'bNEO'],
      DOGEF: ['FLM', 'bNEO'],
      FDE: ['FLM', 'bNEO'],
      fUSDT: ['FLM', 'bNEO', 'fWBTC', 'FUSD'],
      fWETH: ['FLM', 'bNEO'],
      fWBTC: ['FLM', 'bNEO', 'fUSDT', 'FUSD'],
      pONT: ['FLM', 'bNEO'],
      pWING: ['FLM', 'bNEO'],
      GM: ['FLM', 'bNEO'],
      fCAKE: ['FLM', 'bNEO'],
      SWTH: ['FLM', 'bNEO'],
      fBNB: ['FLM', 'bNEO'],
      WETH: [],
      WBTC: [],
      USDT: [],
      xWETH: [],
      xWBTC: [],
      xUSDT: [],
      ONTd: [],
      WING: [],
      CAKE: [],
      xfCAKE: [],
    }

    const response = FlamingoSwapMultiInvoke.createPoolGraph(network)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to list swappable tokens', () => {
    const expectedResponse = [
      '0xf0151f528127558851b39c2cd8aa47da7418ab28',
      '0x340720c7107ef5721e44ed2ea8e314cce5c130fa',
      '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
      '0x1005d400bcc2a56b7352f09e273be3f9933a5fb1',
      '0x8c07b4c9f5bc170a3922eac4f5bb7ef17b0acc8b',
      '0xa8c51aa0c177187aeed3db88bdfa908ccbc9b1a5',
      '0x2d4c6cf0417209a7eb410160344e224e74f87195',
      '0x88da18a5bca86ec8206d9b4960a7d0c4355a432f',
      '0x322b5a366ca724801a1aa01e669b5f3d7f8c7f6f',
      '0xa3291b66f70d4687fc0e41977d8acb0699f235ae',
      '0x9770f4d78a19d1a6fa94b472bcedffcc06b56c49',
      '0xcd48b160c1bbc9d74997b803b9a7ad50a4bef020',
      '0xc14b601252aa5dfa6166cf35fe5ccd2e35f3fdf5',
      '0xd6abe115ecb75e1fa0b42f5e85934ce8c1ae2893',
      '0x8122bc2212ec971690a044b37a6f52a9349b702b',
      '0xeeccd60ed722111f8400434dac3ba42c14d8beb1',
      '0x9b049f1283515eef1d3f6ac610e1595ed25ca3e9',
      '0xe65b462b90516012826f8a9c4c285d8c750e3a77',
      '0x78e1330db47634afdb5ea455302ba2d12b8d549f',
      '0xb56f0fba45cc57a948b342186274dfd863996bb3',
    ]

    const response = FlamingoSwapMultiInvoke.listSwappableTokens(network)
    expect(response).toEqual(expectedResponse)
  })
})
