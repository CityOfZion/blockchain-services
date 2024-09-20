import { Network, SwapRoute } from '@cityofzion/blockchain-service'
import BigNumber from 'bignumber.js'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { FlamingoSwapConstants } from '../../constants/FlamingoSwapConstants'
import { FlamingoSwapHelper } from '../../helpers/FlamingoSwapHelper'

let network: Network<BSNeo3NetworkId>

describe('FlamingoSwapHelper', () => {
  beforeEach(() => {
    network = BSNeo3Constants.DEFAULT_NETWORK
  })

  it('Should be able to get flamingo swap pools', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_POOLS[network.id]

    const response = FlamingoSwapHelper.getFlamingoSwapPools(network)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get flamingo swap pool', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_POOLS[network.id]['FLP-FLM-bNEO']

    const response = FlamingoSwapHelper.getFlamingoSwapPool(network, 'FLP-FLM-bNEO')
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get flamingo swap tokens', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]

    const response = FlamingoSwapHelper.getFlamingoSwapTokens(network)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get flamingo swap token', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']

    const response = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get flamingo swap script hashes', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_SCRIPT_HASHES[network.id]

    const response = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to FLM', () => {
    const expectedResponse = [
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: '19829648800704',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
        reserveTokenToReceive: '1090384336024363',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to SWTH', () => {
    const expectedResponse = [
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'],
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: '19829648800704',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
        reserveTokenToReceive: '1090384336024363',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
        reserveTokenToUse: '157392063184512',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'],
        reserveTokenToReceive: '2397722295778672',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to NEO', () => {
    const expectedResponse = [
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: '18558630175629',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '6187306643025',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToReceive: '0',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override token - FLM', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']

    const response = FlamingoSwapHelper.overrideToken(
      network,
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override token - NEO', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO']

    const response = FlamingoSwapHelper.overrideToken(
      network,
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount input - NEO', () => {
    const expectedResponse = new BigNumber('100000000')

    const response = FlamingoSwapHelper.overrideAmountInput(
      network,
      '1',
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount input - FLM', () => {
    const expectedResponse = new BigNumber('100000000')

    const response = FlamingoSwapHelper.overrideAmountInput(
      network,
      '1',
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount to display - NEO', () => {
    const expectedResponse = '0.00000001'

    const response = FlamingoSwapHelper.overrideAmountToDisplay(
      network,
      '1',
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount to display - FLM', () => {
    const expectedResponse = '0.00000001'

    const response = FlamingoSwapHelper.overrideAmountToDisplay(
      network,
      '1',
      FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']
    )
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override route - GAS to NEO', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: '18525012716663',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '6198506692242',
      },
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: '18525012716663',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '6198506692242',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToReceive: '0',
      },
    ]

    const response = FlamingoSwapHelper.overrideRoute(network, route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override route - NEO to GAS', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '6198506692242',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToReceive: '18525012716663',
      },
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '6198506692242',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToReceive: '18525012716663',
      },
    ]

    const response = FlamingoSwapHelper.overrideRoute(network, route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to normalize hash', () => {
    const expectedResponse = '1234'

    const response = FlamingoSwapHelper.normalizeHash('0x1234')
    expect(response).toEqual(expectedResponse)
  })
})
