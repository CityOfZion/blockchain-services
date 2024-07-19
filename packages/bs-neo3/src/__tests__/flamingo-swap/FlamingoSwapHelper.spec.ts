import { Network, SwapRoute } from '@cityofzion/blockchain-service'
import BigNumber from 'bignumber.js'
import { BSNeo3NetworkId } from '../../BSNeo3Helper'
import { FlamingoSwapHelper, GetSwapFieldsResponse } from '../../flamingo-swap/FlamingoSwapHelper'
import { FlamingoSwapConstants } from '../../flamingo-swap/FlamingoSwapConstants'

const network: Network<BSNeo3NetworkId> = {
  name: 'mainnet',
  id: 'mainnet',
  url: 'https://mainnet1.neo.coz.io:443',
}

const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
const FLM = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')
const SWTH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH')
const fWETH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'fWETH')

describe('FlamingoSwapHelper', () => {
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
    const expectedResponse = FLM

    const response = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get flamingo swap script hashes', () => {
    const expectedResponse = FlamingoSwapConstants.FLAMINGO_SWAP_SCRIPT_HASHES[network.id]

    const response = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - GAS to FLM (amountToReceive)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToReceiveToDisplay: '54.689458',
      amountToUseToDisplay: '1',
      liquidityProviderFee: '0.0030',
      priceImpact: '0.0005',
      priceInverse: '54.68945799999999998915',
      minimumReceived: null,
      maximumSelling: '1.005',
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: '54.689458',
      amountToUse: null,
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: FLM,
          reserveTokenToUse: '19846876058154',
          reserveTokenToReceive: '1088686406470530',
        },
      ],
      slippage: 0.5,
      tokenToUse: GAS,
      tokenToReceive: FLM,
    })

    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - GAS to FLM (amountToUse)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToUseToDisplay: '1',
      amountToReceiveToDisplay: '54.98070076',
      liquidityProviderFee: '0.0030',
      priceImpact: '0.0005',
      priceInverse: '54.9807007600000000005',
      minimumReceived: '54.70579726',
      maximumSelling: null,
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: null,
      amountToUse: '1',
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: FLM,
          reserveTokenToUse: '19794305667601',
          reserveTokenToReceive: '1091585033458512',
        },
      ],
      slippage: 0.5,
      tokenToUse: GAS,
      tokenToReceive: FLM,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - GAS to SWTH (amountToReceive)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToReceiveToDisplay: '100',
      amountToUseToDisplay: '0.12038852',
      liquidityProviderFee: '0.0007',
      priceImpact: '0.0005',
      priceInverse: '830.64398499125996398992',
      minimumReceived: null,
      maximumSelling: '0.12099046',
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: '100',
      amountToUse: null,
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: FLM,
          reserveTokenToUse: '19846876058154',
          reserveTokenToReceive: '1088686406470530',
        },
        {
          tokenToUse: FLM,
          tokenToReceive: SWTH,
          reserveTokenToUse: '157392063184512',
          reserveTokenToReceive: '2397722295778672',
        },
      ],
      slippage: 0.5,
      tokenToUse: GAS,
      tokenToReceive: SWTH,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - GAS to SWTH (amountToUse)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToUseToDisplay: '1',
      amountToReceiveToDisplay: '829.24287034',
      liquidityProviderFee: '0.0060',
      priceImpact: '0.0040',
      priceInverse: '829.24287034000000020972',
      minimumReceived: '825.09665599',
      maximumSelling: null,
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: null,
      amountToUse: '1',
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: FLM,
          reserveTokenToUse: '19794305667601',
          reserveTokenToReceive: '1091585033458512',
        },
        {
          tokenToUse: FLM,
          tokenToReceive: SWTH,
          reserveTokenToUse: '157941788184512',
          reserveTokenToReceive: '2389397694149612',
        },
      ],
      slippage: 0.5,
      tokenToUse: GAS,
      tokenToReceive: SWTH,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - GAS to NEO (amountToReceive)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToReceiveToDisplay: '1',
      amountToUseToDisplay: '3.00744753',
      liquidityProviderFee: '0.0090',
      priceImpact: '0.0016',
      priceInverse: '0.33250787919814514603',
      minimumReceived: null,
      maximumSelling: '3.02248477',
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: '1',
      amountToUse: null,
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: bNEO,
          reserveTokenToUse: '18554970323985',
          reserveTokenToReceive: '6188338564782',
        },
        {
          tokenToUse: bNEO,
          tokenToReceive: NEO,
          reserveTokenToUse: '0',
          reserveTokenToReceive: '0',
        },
      ],
      slippage: 0.5,
      tokenToUse: GAS,
      tokenToReceive: NEO,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get swap fields - NEO to GAS (amountToUse)', () => {
    const expectedResponse: GetSwapFieldsResponse = {
      amountToUseToDisplay: '1',
      amountToReceiveToDisplay: '2.98933343',
      liquidityProviderFee: '0.0030',
      priceImpact: '0.0016',
      priceInverse: '2.98933343000000000001',
      minimumReceived: '2.97438676',
      maximumSelling: null,
    }

    const response = FlamingoSwapHelper.getSwapFields({
      network,
      amountToReceive: null,
      amountToUse: '1',
      route: [
        {
          tokenToUse: NEO,
          tokenToReceive: bNEO,
          reserveTokenToUse: '0',
          reserveTokenToReceive: '0',
        },
        {
          tokenToUse: bNEO,
          tokenToReceive: GAS,
          reserveTokenToUse: '6188338564782',
          reserveTokenToReceive: '18554970323985',
        },
      ],
      slippage: 0.5,
      tokenToUse: NEO,
      tokenToReceive: GAS,
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to calculate the amount to receive - FLM to fWETH', async () => {
    const expectedResponse = '3268784890504'

    const response = FlamingoSwapHelper.calculateAmountToReceive({
      amountToUse: '0.16150486',
      route: [
        {
          tokenToUse: FLM,
          reserveTokenToUse: '1096070590440210',
          tokenToReceive: fWETH,
          reserveTokenToReceive: '222507225918934814870',
        },
      ],
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to calculate the amount to receive - NEO to GAS', async () => {
    const expectedResponse = '299042171'

    const response = FlamingoSwapHelper.calculateAmountToReceive({
      amountToUse: '1',
      route: [
        {
          tokenToUse: bNEO,
          reserveTokenToUse: '6187306643025',
          tokenToReceive: GAS,
          reserveTokenToReceive: '18558630175629',
        },
      ],
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to calculate the amount to use - GAS to FLM', async () => {
    const expectedResponse = '224360'

    const response = FlamingoSwapHelper.calculateAmountToUse({
      amountToReceive: '0.123',
      route: [
        {
          tokenToUse: GAS,
          reserveTokenToUse: '19829648800704',
          tokenToReceive: FLM,
          reserveTokenToReceive: '1090384336024363',
        },
      ],
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to calculate the amount to use - GAS to NEO', async () => {
    const expectedResponse = '300854242'

    const response = FlamingoSwapHelper.calculateAmountToUse({
      amountToReceive: '1',
      route: [
        {
          tokenToUse: GAS,
          reserveTokenToUse: '18558630175629',
          tokenToReceive: bNEO,
          reserveTokenToReceive: '6187306643025',
        },
      ],
    })
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to FLM', () => {
    const expectedResponse = [GAS, FLM]

    const route: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: '19829648800704',
        tokenToReceive: FLM,
        reserveTokenToReceive: '1090384336024363',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to SWTH', () => {
    const expectedResponse = [GAS, FLM, SWTH]

    const route: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: '19829648800704',
        tokenToReceive: FLM,
        reserveTokenToReceive: '1090384336024363',
      },
      {
        tokenToUse: FLM,
        reserveTokenToUse: '157392063184512',
        tokenToReceive: SWTH,
        reserveTokenToReceive: '2397722295778672',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to get route path - GAS to NEO', () => {
    const expectedResponse = [GAS, bNEO, NEO]

    const route: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: '18558630175629',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '6187306643025',
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '0',
        tokenToReceive: NEO,
        reserveTokenToReceive: '0',
      },
    ]

    const response = FlamingoSwapHelper.getRoutePath(route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override token - FLM', () => {
    const expectedResponse = FLM

    const response = FlamingoSwapHelper.overrideToken(network, FLM)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override token - NEO', () => {
    const expectedResponse = bNEO

    const response = FlamingoSwapHelper.overrideToken(network, NEO)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount input - NEO', () => {
    const expectedResponse = new BigNumber('100000000')

    const response = FlamingoSwapHelper.overrideAmountInput(network, '1', NEO)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount input - FLM', () => {
    const expectedResponse = new BigNumber('100000000')

    const response = FlamingoSwapHelper.overrideAmountInput(network, '1', FLM)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount to display - NEO', () => {
    const expectedResponse = '0.00000001'

    const response = FlamingoSwapHelper.overrideAmountToDisplay(network, '1', NEO)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override amount to display - FLM', () => {
    const expectedResponse = '0.00000001'

    const response = FlamingoSwapHelper.overrideAmountToDisplay(network, '1', FLM)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override route - GAS to NEO', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: '18525012716663',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '6198506692242',
      },
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: '18525012716663',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '6198506692242',
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '0',
        tokenToReceive: NEO,
        reserveTokenToReceive: '0',
      },
    ]

    const response = FlamingoSwapHelper.overrideRoute(network, route)
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to override route - NEO to GAS', async () => {
    const expectedResponse: SwapRoute[] = [
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '6198506692242',
        tokenToReceive: GAS,
        reserveTokenToReceive: '18525012716663',
      },
    ]

    const route: SwapRoute[] = [
      {
        tokenToUse: NEO,
        reserveTokenToUse: '0',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '6198506692242',
        tokenToReceive: GAS,
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
