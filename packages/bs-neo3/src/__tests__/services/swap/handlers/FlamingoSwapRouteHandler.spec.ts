import { Network, SwapRoute } from '@cityofzion/blockchain-service'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../../../constants/BSNeo3Constants'
import { FlamingoSwapHelper } from '../../../../helpers/FlamingoSwapHelper'
import { FlamingoSwapRouteHandler } from '../../../../services/swap/handlers'

let network: Network<BSNeo3NetworkId>

describe('FlamingoSwapRouteHandler', () => {
  beforeEach(() => {
    network = BSNeo3Constants.DEFAULT_NETWORK
  })

  it('should calculate best route for swap - GAS to NEO', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
        reserveTokenToReceive: '0',
      },
    ]

    const response = await FlamingoSwapRouteHandler.calculateBestRouteForSwap({
      network,
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate best route for swap - NEO to GAS', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
        reserveTokenToReceive: expect.any(String),
      },
    ]

    const response = await FlamingoSwapRouteHandler.calculateBestRouteForSwap({
      network,
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate best route for swap - GAS to SWTH', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH'),
        reserveTokenToReceive: expect.any(String),
      },
    ]

    const response = await FlamingoSwapRouteHandler.calculateBestRouteForSwap({
      network,
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH'),
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate best route for swap - SWTH to GAS', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
        reserveTokenToReceive: expect.any(String),
      },
    ]

    const response = await FlamingoSwapRouteHandler.calculateBestRouteForSwap({
      network,
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH'),
    })

    expect(response).toEqual(expectedResponse)
  })
})
