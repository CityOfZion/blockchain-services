import { Network, SwapServiceSwapToReceiveArgs, SwapServiceSwapToUseArgs, Token } from '@cityofzion/blockchain-service'
import { tx, u } from '@cityofzion/neon-core'
import { Arg, ContractInvocation, ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { FlamingoSwapConstants, FlamingoSwapScriptHashes } from '../../constants/FlamingoSwapConstants'
import { BSNeo3NetworkId } from '../../helpers/BSNeo3Helper'
import { FlamingoSwapHelper } from '../../helpers/FlamingoSwapHelper'
import { NeonDappKitInvocationBuilderNeo3 } from './NeonDappKitInvocationBuilderNeo3'

export class FlamingoSwapInvocationBuilderNeo3 {
  static swapInvocation(
    data: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> | SwapServiceSwapToUseArgs<BSNeo3NetworkId>
  ): ContractInvocationMulti {
    return data.type === 'swapTokenToReceive'
      ? this.#buildSwapTokenToReceiveInvocation(data)
      : this.#buildSwapTokenToUseInvocation(data)
  }

  static #buildSwapTokenToReceiveInvocation({
    address,
    amountToReceive,
    deadline,
    maximumSelling,
    network,
    routePath,
  }: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const [tokenToUse] = routePath
    const tokenToReceive = routePath[routePath.length - 1]

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

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

    invocations.push(swapInvocation)
    allowedContracts.push(...this.#getAllowedContracts(scriptHashes, routePath))

    if (FlamingoSwapHelper.isNeoToken(network, tokenToReceive)) {
      const amountToReceiveTransfer = u.BigInteger.fromNumber(
        Number(amountToReceiveFormatted) * FlamingoSwapConstants.GAS_PER_NEO
      ).toString()

      const gasHash = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS').hash
      const neoTransferInvocation = this.#buildNEOTransferInvocation(address, gasHash, amountToReceiveTransfer, network)

      invocations.push(neoTransferInvocation)
      allowedContracts.push(FlamingoSwapHelper.getFlamingoSwapPool(network, 'FLP-bNEO-GAS').hash)
    }

    return {
      invocations,
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts }],
    }
  }

  static #buildSwapTokenToUseInvocation({
    address,
    amountToUse,
    deadline,
    minimumReceived,
    network,
    routePath,
  }: SwapServiceSwapToUseArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const [tokenToUse] = routePath
    const tokenToReceive = routePath[routePath.length - 1]

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

    if (FlamingoSwapHelper.isNeoToken(network, tokenToUse)) {
      const neoHash = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO').hash
      const neoTransferInvocation = this.#buildNEOTransferInvocation(address, neoHash, amountToUse, network)

      invocations.push(neoTransferInvocation)
      allowedContracts.push(FlamingoSwapHelper.getFlamingoSwapPool(network, 'FLP-bNEO-GAS').hash)
    }

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

    invocations.push(swapInvocation)
    allowedContracts.push(...this.#getAllowedContracts(scriptHashes, routePath))

    return {
      invocations,
      signers: [{ scopes: tx.WitnessScope.CustomContracts, allowedContracts }],
    }
  }

  static #mapRoutePathToArgs(routePath: Token[]): Arg[] {
    return routePath.map(token => ({
      type: 'Hash160',
      value: token.hash,
    }))
  }

  static #getAllowedContracts(scriptHashes: FlamingoSwapScriptHashes, routePath: Token[]): string[] {
    return [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
      ...routePath.map(token => token.hash),
    ]
  }

  static #buildNEOTransferInvocation(
    senderAddress: string,
    contractHash: string,
    amount: string,
    network: Network
  ): ContractInvocation {
    const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

    return NeonDappKitInvocationBuilderNeo3.transferContractInvocation({
      contractHash,
      tokenHash: bNEO.hash,
      senderAddress,
      amount,
    })
  }
}
