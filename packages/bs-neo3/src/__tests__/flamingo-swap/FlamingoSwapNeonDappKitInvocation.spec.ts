import { Network } from '@cityofzion/blockchain-service'
import { ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { tx } from '@cityofzion/neon-core'
import { FlamingoSwapHelper } from '../../flamingo-swap/FlamingoSwapHelper'
import {
  FlamingoSwapNeonDappKitInvocationBuilder,
  GetReservesArgs,
} from '../../flamingo-swap/FlamingoSwapNeonDappKitInvocationBuilder'
import { BSNeo3NetworkId } from '../../BSNeo3Helper'

const network: Network<BSNeo3NetworkId> = {
  name: 'mainnet',
  id: 'mainnet',
  url: 'https://mainnet1.neo.coz.io:443',
}
const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
const FLM = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
const SWTH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH')

describe('FlamingoSwapNeonDappKitInvocationBuilder', () => {
  it('Should return the invocation for getReserves', () => {
    const getReservesArgs: GetReservesArgs = {
      network,
      route: [
        {
          tokenToUse: GAS,
          tokenToReceive: FLM,
        },
        {
          tokenToUse: FLM,
          tokenToReceive: SWTH,
        },
      ],
    }

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(getReservesArgs.network)

    const response = FlamingoSwapNeonDappKitInvocationBuilder.getReservesInvocation({
      network: getReservesArgs.network,
      route: getReservesArgs.route,
    })

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: scriptHashes.flamingoSwapRouter,
          operation: 'getReserves',
          args: [
            {
              type: 'Hash160',
              value: getReservesArgs.route[0].tokenToReceive.hash,
            },
            {
              type: 'Hash160',
              value: getReservesArgs.route[0].tokenToUse.hash,
            },
          ],
        },
        {
          scriptHash: scriptHashes.flamingoSwapRouter,
          operation: 'getReserves',
          args: [
            {
              type: 'Hash160',
              value: getReservesArgs.route[1].tokenToReceive.hash,
            },
            {
              type: 'Hash160',
              value: getReservesArgs.route[1].tokenToUse.hash,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 1,
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should return the invocation for swapTokenOutForTokenIn', () => {
    const address = 'address'
    const amountToReceive = '1'
    const maximumSelling = '1'
    const routePath = [GAS, FLM, SWTH]
    const deadline = '1'

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const response = FlamingoSwapNeonDappKitInvocationBuilder.swapInvocation({
      address,
      amountToReceive,
      maximumSelling,
      routePath,
      deadline,
      network,
      type: 'swapTokenToReceive',
    })

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: scriptHashes.flamingoSwapRouter,
          operation: 'swapTokenOutForTokenIn',
          args: [
            {
              type: 'Hash160',
              value: address,
            },
            {
              type: 'Integer',
              value: String(Number(amountToReceive) * 10 ** routePath[0].decimals),
            },
            {
              type: 'Integer',
              value: String(Number(maximumSelling) * 10 ** routePath[0].decimals),
            },
            {
              type: 'Array',
              value: routePath.map(token => ({
                type: 'Hash160',
                value: token.hash,
              })),
            },
            {
              type: 'Integer',
              value: deadline,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts: [
            scriptHashes.flamingoSwapRouter,
            scriptHashes.flamingoFactory,
            scriptHashes.flamingoPairWhiteList,
            ...routePath.map(token => token.hash),
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should return the invocation for swapTokenInForTokenOut', () => {
    const address = 'address'
    const amountToUse = '1'
    const minimumReceived = '1'
    const routePath = [GAS, FLM, SWTH]
    const deadline = '1'

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const response = FlamingoSwapNeonDappKitInvocationBuilder.swapInvocation({
      address,
      amountToUse,
      minimumReceived,
      routePath,
      deadline,
      network,
      type: 'swapTokenToUse',
    })

    const expectedResponse: ContractInvocationMulti = {
      invocations: [
        {
          scriptHash: scriptHashes.flamingoSwapRouter,
          operation: 'swapTokenInForTokenOut',
          args: [
            {
              type: 'Hash160',
              value: address,
            },
            {
              type: 'Integer',
              value: String(Number(amountToUse) * 10 ** routePath[0].decimals),
            },
            {
              type: 'Integer',
              value: String(Number(minimumReceived) * 10 ** routePath[0].decimals),
            },
            {
              type: 'Array',
              value: routePath.map(token => ({
                type: 'Hash160',
                value: token.hash,
              })),
            },
            {
              type: 'Integer',
              value: deadline,
            },
          ],
        },
      ],
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts: [
            scriptHashes.flamingoSwapRouter,
            scriptHashes.flamingoFactory,
            scriptHashes.flamingoPairWhiteList,
            ...routePath.map(token => token.hash),
          ],
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })
})
