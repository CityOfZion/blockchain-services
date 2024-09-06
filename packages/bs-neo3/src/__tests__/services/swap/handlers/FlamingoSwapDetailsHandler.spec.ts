import { Network } from '@cityofzion/blockchain-service'
import { FlamingoSwapHelper } from '../../../../helpers/FlamingoSwapHelper'
import { FlamingoSwapDetailsHandler } from '../../../../services/swap/handlers'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../../../constants/BSNeo3Constants'

let network: Network<BSNeo3NetworkId>

describe('FlamingoSwapDetailsHandler', () => {
  beforeEach(() => {
    network = BSNeo3Constants.DEFAULT_NETWORK
  })

  it('should calculate swap details - GAS to NEO', async () => {
    const expectedResponse = {
      amountToReceiveToDisplay: '1',
      amountToUseToDisplay: '0.00000001',
      liquidityProviderFee: '0.0000',
      maximumSelling: '0.00000001',
      minimumReceived: null,
      priceImpact: expect.any(Object),
      priceInverse: '100000000',
    }

    const response = FlamingoSwapDetailsHandler.calculateSwapDetails({
      amountToUse: null,
      amountToReceive: '1',
      network,
      route: [
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
          reserveTokenToReceive: '0',
        },
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
          reserveTokenToReceive: '0',
        },
      ],
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
      slippage: 0,
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate swap details - NEO to GAS', async () => {
    const expectedResponse = {
      amountToReceiveToDisplay: '0',
      amountToUseToDisplay: '1',
      liquidityProviderFee: '0.0030',
      maximumSelling: null,
      minimumReceived: '0',
      priceImpact: expect.any(Object),
      priceInverse: '0',
    }

    const response = FlamingoSwapDetailsHandler.calculateSwapDetails({
      amountToUse: '1',
      amountToReceive: null,
      network,
      route: [
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
          reserveTokenToReceive: '0',
        },
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
          reserveTokenToReceive: '0',
        },
      ],
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO'),
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      slippage: 0,
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate swap details - GAS to SWTH', async () => {
    const expectedResponse = {
      amountToReceiveToDisplay: '1',
      amountToUseToDisplay: '0.00000001',
      liquidityProviderFee: '0.0000',
      maximumSelling: '0.00000001',
      minimumReceived: null,
      priceImpact: expect.any(Object),
      priceInverse: '100000000',
    }

    const response = FlamingoSwapDetailsHandler.calculateSwapDetails({
      amountToUse: null,
      amountToReceive: '1',
      network,
      route: [
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
          reserveTokenToReceive: '0',
        },
      ],
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
      slippage: 0,
    })

    expect(response).toEqual(expectedResponse)
  })

  it('should calculate swap details - SWTH to GAS', async () => {
    const expectedResponse = {
      amountToReceiveToDisplay: '0',
      amountToUseToDisplay: '1',
      liquidityProviderFee: '0.0030',
      maximumSelling: null,
      minimumReceived: '0',
      priceImpact: expect.any(Object),
      priceInverse: '0',
    }

    const response = FlamingoSwapDetailsHandler.calculateSwapDetails({
      amountToUse: '1',
      amountToReceive: null,
      network,
      route: [
        {
          tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
          reserveTokenToUse: '0',
          tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
          reserveTokenToReceive: '0',
        },
      ],
      tokenToUse: FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM'),
      tokenToReceive: FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS'),
      slippage: 0,
    })

    expect(response).toEqual(expectedResponse)
  })
})
