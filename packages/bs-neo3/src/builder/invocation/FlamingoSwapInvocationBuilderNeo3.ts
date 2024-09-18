import { SwapServiceSwapToReceiveArgs, SwapServiceSwapToUseArgs, Token } from '@cityofzion/blockchain-service'
import { tx, u } from '@cityofzion/neon-core'
import { Arg, ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { FlamingoSwapConstants, FlamingoSwapScriptHashes } from '../../constants/FlamingoSwapConstants'
import { FlamingoSwapHelper } from '../../helpers/FlamingoSwapHelper'
import { NeonDappKitInvocationBuilderNeo3 } from './NeonDappKitInvocationBuilderNeo3'

type SwapParams = {
  scriptHashes: FlamingoSwapScriptHashes
  tokenToUse: Token
  tokenToReceive: Token
}

type SwapTokenToReceiveInvocationParams = SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> & SwapParams
type SwapTokenToUseInvocationParams = SwapServiceSwapToUseArgs<BSNeo3NetworkId> & SwapParams

export class FlamingoSwapInvocationBuilderNeo3 {
  static swapInvocation(
    data: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> | SwapServiceSwapToUseArgs<BSNeo3NetworkId>
  ): ContractInvocationMulti {
    const { routePath, network, type } = data

    const [tokenToUse] = routePath
    const tokenToReceive = routePath[routePath.length - 1]

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const swapParams: SwapParams = {
      scriptHashes,
      tokenToUse,
      tokenToReceive,
    }

    if (type === 'swapTokenToReceive') {
      return this.#swapTokenToReceiveInvocation({
        ...data,
        ...swapParams,
      })
    }

    return this.#swapTokenToUseInvocation({
      ...data,
      ...swapParams,
    })
  }

  static #swapTokenToReceiveInvocation(data: SwapTokenToReceiveInvocationParams): ContractInvocationMulti {
    const { network, routePath } = data

    if (FlamingoSwapHelper.isSwapUnwrappingNeo(network, routePath)) {
      return this.#swapUnwrappingNeoInvocation(data)
    }

    if (FlamingoSwapHelper.isUnwrapNeo(network, routePath)) {
      return this.#unwrapNeoInvocation(data)
    }

    return this.#swapReceiveInvocation(data)
  }

  static #swapTokenToUseInvocation(data: SwapTokenToUseInvocationParams): ContractInvocationMulti {
    const { network, routePath } = data

    if (FlamingoSwapHelper.isSwapWrappingNeo(network, routePath)) {
      return this.#swapWrappingNeoInvocation(data)
    }

    if (FlamingoSwapHelper.isWrapNeo(network, routePath)) {
      return this.#wrapNeoInvocation(data)
    }

    return this.#swapToUseInvocation(data)
  }

  static #swapUnwrappingNeoInvocation(data: SwapTokenToReceiveInvocationParams): ContractInvocationMulti {
    const {
      address,
      amountToReceive,
      deadline,
      maximumSelling,
      network,
      routePath,
      scriptHashes,
      tokenToReceive,
      tokenToUse,
    } = data

    const tokenToReceiveOverrode = FlamingoSwapHelper.overrideToken(network, tokenToReceive)
    const routePathOverrode = FlamingoSwapHelper.overrideRoutePath(network, routePath)

    const amountToReceiveFormatted = FlamingoSwapHelper.formatAmount(amountToReceive, tokenToReceiveOverrode.decimals)
    const maximumSellingFormatted = FlamingoSwapHelper.formatAmount(maximumSelling, tokenToUse.decimals)

    const amountToReceiveTransfer = u.BigInteger.fromNumber(
      Number(amountToReceiveFormatted) * FlamingoSwapConstants.UNWRAPPING_FEE
    ).toString()

    const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
    const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

    const unwrapInvocation = NeonDappKitInvocationBuilderNeo3.transferContractInvocation({
      contractHash: GAS.hash,
      tokenHash: bNEO.hash,
      senderAddress: address,
      amount: amountToReceiveTransfer,
    })
    const unwrapAllowedContracts = [GAS.hash, bNEO.hash]

    const swapInvocation = NeonDappKitInvocationBuilderNeo3.swapTokenOutForTokenInContractInvocation({
      routerScriptHash: scriptHashes.flamingoSwapRouter,
      senderAddress: address,
      amountToReceive: amountToReceiveFormatted,
      maximumSelling: maximumSellingFormatted,
      deadline,
      args: this.#mapRoutePathToArgs(routePathOverrode),
    })
    const swapAllowedContracts = [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
    ]

    const allowedContracts = [
      ...new Set([...swapAllowedContracts, ...unwrapAllowedContracts, ...routePath.map(token => token.hash)]),
    ]

    return {
      invocations: [swapInvocation, unwrapInvocation],
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts,
        },
      ],
    }
  }

  static #unwrapNeoInvocation(data: SwapTokenToReceiveInvocationParams): ContractInvocationMulti {
    const { address, amountToReceive, network, tokenToReceive } = data

    const tokenToReceiveOverrode = FlamingoSwapHelper.overrideToken(network, tokenToReceive)
    const amountToReceiveFormatted = FlamingoSwapHelper.formatAmount(amountToReceive, tokenToReceiveOverrode.decimals)

    const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
    const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

    const unwrappedAmount = FlamingoSwapHelper.getUnwrappedAmount(amountToReceiveFormatted)
    const unwrapInvocation = NeonDappKitInvocationBuilderNeo3.transferContractInvocation({
      contractHash: GAS.hash,
      tokenHash: bNEO.hash,
      senderAddress: address,
      amount: unwrappedAmount,
    })
    const unwrapAllowedContracts = [GAS.hash, bNEO.hash]

    return {
      invocations: [unwrapInvocation],
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts: unwrapAllowedContracts }],
    }
  }

  static #swapReceiveInvocation(data: SwapTokenToReceiveInvocationParams): ContractInvocationMulti {
    const {
      address,
      amountToReceive,
      deadline,
      maximumSelling,
      network,
      routePath,
      scriptHashes,
      tokenToReceive,
      tokenToUse,
    } = data

    const tokenToReceiveOverrode = FlamingoSwapHelper.overrideToken(network, tokenToReceive)
    const routePathOverrode = FlamingoSwapHelper.overrideRoutePath(network, routePath)

    const amountToReceiveFormatted = FlamingoSwapHelper.formatAmount(amountToReceive, tokenToReceiveOverrode.decimals)
    const maximumSellingFormatted = FlamingoSwapHelper.formatAmount(maximumSelling, tokenToUse.decimals)

    const swapInvocation = NeonDappKitInvocationBuilderNeo3.swapTokenOutForTokenInContractInvocation({
      routerScriptHash: scriptHashes.flamingoSwapRouter,
      senderAddress: address,
      amountToReceive: amountToReceiveFormatted,
      maximumSelling: maximumSellingFormatted,
      deadline,
      args: this.#mapRoutePathToArgs(routePathOverrode),
    })

    const swapAllowedContracts = [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
    ]

    const allowedContracts = [...new Set([...swapAllowedContracts, ...routePath.map(token => token.hash)])]

    return {
      invocations: [swapInvocation],
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts }],
    }
  }

  static #swapWrappingNeoInvocation(data: SwapTokenToUseInvocationParams): ContractInvocationMulti {
    const {
      address,
      amountToUse,
      network,
      deadline,
      minimumReceived,
      routePath,
      scriptHashes,
      tokenToReceive,
      tokenToUse,
    } = data

    const tokenToUseOverrode = FlamingoSwapHelper.overrideToken(network, tokenToUse)
    const routePathOverrode = FlamingoSwapHelper.overrideRoutePath(network, routePath)

    const amountToUseFormatted = FlamingoSwapHelper.formatAmount(amountToUse, tokenToUseOverrode.decimals)
    const minimumReceivedFormatted = FlamingoSwapHelper.formatAmount(minimumReceived, tokenToReceive.decimals)

    const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
    const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

    const wrapInvocation = NeonDappKitInvocationBuilderNeo3.transferContractInvocation({
      contractHash: NEO.hash,
      tokenHash: bNEO.hash,
      senderAddress: address,
      amount: amountToUse,
    })
    const wrapAllowedContracts = [NEO.hash, bNEO.hash]

    const swapInvocation = NeonDappKitInvocationBuilderNeo3.swapTokenInForTokenOutContractInvocation({
      routerScriptHash: scriptHashes.flamingoSwapRouter,
      amountToUse: amountToUseFormatted,
      minimumReceived: minimumReceivedFormatted,
      senderAddress: address,
      deadline,
      args: this.#mapRoutePathToArgs(routePathOverrode),
    })

    const swapAllowedContracts = [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
    ]

    const allowedContracts = [
      ...new Set([...swapAllowedContracts, ...wrapAllowedContracts, ...routePath.map(token => token.hash)]),
    ]

    return {
      invocations: [wrapInvocation, swapInvocation],
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts,
        },
      ],
    }
  }

  static #wrapNeoInvocation(data: SwapTokenToUseInvocationParams): ContractInvocationMulti {
    const { address, amountToUse, network } = data

    const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
    const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

    const wrapInvocation = NeonDappKitInvocationBuilderNeo3.transferContractInvocation({
      contractHash: NEO.hash,
      tokenHash: bNEO.hash,
      senderAddress: address,
      amount: amountToUse,
    })
    const wrapAllowedContracts = [NEO.hash, bNEO.hash]

    return {
      invocations: [wrapInvocation],
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts: wrapAllowedContracts }],
    }
  }

  static #swapToUseInvocation(data: SwapTokenToUseInvocationParams): ContractInvocationMulti {
    const {
      address,
      amountToUse,
      deadline,
      minimumReceived,
      network,
      routePath,
      scriptHashes,
      tokenToReceive,
      tokenToUse,
    } = data

    const tokenToUseOverrode = FlamingoSwapHelper.overrideToken(network, tokenToUse)
    const routePathOverrode = FlamingoSwapHelper.overrideRoutePath(network, routePath)

    const amountToUseFormatted = FlamingoSwapHelper.formatAmount(amountToUse, tokenToUseOverrode.decimals)
    const minimumReceivedFormatted = FlamingoSwapHelper.formatAmount(minimumReceived, tokenToReceive.decimals)

    const swapInvocation = NeonDappKitInvocationBuilderNeo3.swapTokenInForTokenOutContractInvocation({
      routerScriptHash: scriptHashes.flamingoSwapRouter,
      amountToUse: amountToUseFormatted,
      minimumReceived: minimumReceivedFormatted,
      senderAddress: address,
      deadline,
      args: this.#mapRoutePathToArgs(routePathOverrode),
    })

    const swapAllowedContracts = [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
    ]

    const allowedContracts = [...new Set([...swapAllowedContracts, ...routePath.map(token => token.hash)])]

    return {
      invocations: [swapInvocation],
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts }],
    }
  }

  static #mapRoutePathToArgs(routePath: Token[]): Arg[] {
    return routePath.map(token => ({
      type: 'Hash160',
      value: token.hash,
    }))
  }
}
