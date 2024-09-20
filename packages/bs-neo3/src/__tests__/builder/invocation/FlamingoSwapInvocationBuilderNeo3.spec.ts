import { Network, SwapServiceSwapToReceiveArgs, SwapServiceSwapToUseArgs } from '@cityofzion/blockchain-service'
import { ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { FlamingoSwapInvocationBuilderNeo3 } from '../../../builder/invocation/FlamingoSwapInvocationBuilderNeo3'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../../constants/BSNeo3Constants'
import { FlamingoSwapConstants } from '../../../constants/FlamingoSwapConstants'

let network: Network<BSNeo3NetworkId>

describe('FlamingoSwapInvocationBuilderNeo3', () => {
  beforeEach(() => {
    network = BSNeo3Constants.DEFAULT_NETWORK
  })

  it('Should match the invocation script swapping NEO to GAS (Swap Wrapping) - swapTokenToUse', () => {
    const NEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    const bNEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO']
    const GAS = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS']

    const data: SwapServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToUse: '2',
      deadline: '10',
      minimumReceived: '5.98684835',
      network,
      routePath: [NEO, bNEO, GAS],
      type: 'swapTokenToUse',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
          operation: 'transfer',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Hash160',
              value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            },
            {
              type: 'Integer',
              value: '2',
            },
            {
              type: 'Any',
              value: null,
            },
          ],
        },
        {
          scriptHash: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
          operation: 'swapTokenInForTokenOut',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Integer',
              value: '200000000',
            },
            {
              type: 'Integer',
              value: '598684835',
            },
            {
              type: 'Array',
              value: [
                {
                  type: 'Hash160',
                  value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
                },
                {
                  type: 'Hash160',
                  value: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
                },
              ],
            },
            {
              type: 'Integer',
              value: expect.any(String),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xf970f4ccecd765b63732b821775dc38c25d74f23',
            '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
            '0xfb75a5314069b56e136713d38477f647a13991b4',
            '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should match the invocation script swapping NEO to bNEO (Wrap NEO) - swapTokenToUse', () => {
    const NEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    const bNEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO']

    const data: SwapServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToUse: '1',
      deadline: '10',
      minimumReceived: '1',
      network,
      routePath: [NEO, bNEO],
      type: 'swapTokenToUse',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
          operation: 'transfer',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Hash160',
              value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            },
            {
              type: 'Integer',
              value: '1',
            },
            {
              type: 'Any',
              value: null,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
            '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should match the invocation script swapping FLM to GAS (Simple swap) - swapTokenToUse', () => {
    const FLM = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']
    const GAS = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS']

    const data: SwapServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToUse: '1',
      deadline: '10',
      minimumReceived: '0.01638157',
      network,
      routePath: [FLM, GAS],
      type: 'swapTokenToUse',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
          operation: 'swapTokenInForTokenOut',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Integer',
              value: '100000000',
            },
            {
              type: 'Integer',
              value: '1638157',
            },
            {
              type: 'Array',
              value: [
                {
                  type: 'Hash160',
                  value: '0xf0151f528127558851b39c2cd8aa47da7418ab28',
                },
                {
                  type: 'Hash160',
                  value: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
                },
              ],
            },
            {
              type: 'Integer',
              value: expect.any(String),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xf970f4ccecd765b63732b821775dc38c25d74f23',
            '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
            '0xfb75a5314069b56e136713d38477f647a13991b4',
            '0xf0151f528127558851b39c2cd8aa47da7418ab28',
            '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should match the invocation script swapping GAS to NEO (Swap Unwrapping) - swapTokenToReceive', () => {
    const NEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    const bNEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO']
    const GAS = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS']

    const data: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToReceive: '1',
      deadline: '10',
      maximumSelling: '3.04188283',
      network,
      routePath: [GAS, bNEO, NEO],
      type: 'swapTokenToReceive',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
          operation: 'swapTokenOutForTokenIn',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Integer',
              value: '100000000',
            },
            {
              type: 'Integer',
              value: '304188283',
            },
            {
              type: 'Array',
              value: [
                {
                  type: 'Hash160',
                  value: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
                },
                {
                  type: 'Hash160',
                  value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
                },
              ],
            },
            {
              type: 'Integer',
              value: expect.any(String),
            },
          ],
        },
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'transfer',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Hash160',
              value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            },
            {
              type: 'Integer',
              value: '100000',
            },
            {
              type: 'Any',
              value: null,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xf970f4ccecd765b63732b821775dc38c25d74f23',
            '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
            '0xfb75a5314069b56e136713d38477f647a13991b4',
            '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should match the invocation script swapping bNEO to NEO (Unwrap NEO) - swapTokenToReceive', () => {
    const NEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO']
    const bNEO = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO']

    const data: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToReceive: '1',
      deadline: '10',
      maximumSelling: '1',
      network,
      routePath: [bNEO, NEO],
      type: 'swapTokenToReceive',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
          operation: 'transfer',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Hash160',
              value: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
            },
            {
              type: 'Integer',
              value: '100000',
            },
            {
              type: 'Any',
              value: null,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should match the invocation script swapping GAS to FLM (Simple Swap) - swapTokenToReceive', () => {
    const GAS = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS']
    const FLM = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM']

    const data: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: 'address',
      amountToReceive: '1',
      deadline: '10',
      maximumSelling: '61.0444685',
      network,
      routePath: [GAS, FLM],
      type: 'swapTokenToReceive',
    }

    const response = FlamingoSwapInvocationBuilderNeo3.swapInvocation(data)

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
          operation: 'swapTokenOutForTokenIn',
          args: [
            {
              type: 'Hash160',
              value: data.address,
            },
            {
              type: 'Integer',
              value: '100000000',
            },
            {
              type: 'Integer',
              value: '6104446850',
            },
            {
              type: 'Array',
              value: [
                {
                  type: 'Hash160',
                  value: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
                },
                {
                  type: 'Hash160',
                  value: '0xf0151f528127558851b39c2cd8aa47da7418ab28',
                },
              ],
            },
            {
              type: 'Integer',
              value: expect.any(String),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            '0xf970f4ccecd765b63732b821775dc38c25d74f23',
            '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
            '0xfb75a5314069b56e136713d38477f647a13991b4',
            '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            '0xf0151f528127558851b39c2cd8aa47da7418ab28',
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })
})
