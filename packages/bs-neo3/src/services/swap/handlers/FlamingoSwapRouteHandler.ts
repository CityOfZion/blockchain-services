import { Network, PoolGraph, SwapRoute, Token } from '@cityofzion/blockchain-service'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import {
  ContractInvocationMulti,
  InvokeResult,
  RpcResponseStackItem,
  TypeChecker,
} from '@cityofzion/neon-dappkit-types'
import { NeonDappKitInvocationBuilderNeo3 } from '../../../builder/invocation/NeonDappKitInvocationBuilderNeo3'
import { BSNeo3NetworkId } from '../../../constants/BSNeo3Constants'
import { FlamingoSwapHelper } from '../../../helpers/FlamingoSwapHelper'

type CalculateBestRouteForSwapArgs = {
  tokenToUse: Token
  tokenToReceive: Token
  network: Network<BSNeo3NetworkId>
}

type InvokeReservesArgs = {
  network: Network
  routePath: RoutePath[]
}

type CreateSwapRouteArgs = {
  network: Network
  routePath: RoutePath[]
  reservesStack: RpcResponseStackItem[]
}

type GetShortestRoutePathArgs = {
  network: Network<BSNeo3NetworkId>
  startToken: Token
  targetToken: Token
}

type TokensVisited = {
  [tokenSymbol: string]: boolean
}

type Predecessor = {
  [tokenSymbol: string]: Token
}

type RoutePath = {
  tokenToUse: Token
  tokenToReceive: Token
}

export class FlamingoSwapRouteHandler {
  static async calculateBestRouteForSwap({
    tokenToUse,
    tokenToReceive,
    network,
  }: CalculateBestRouteForSwapArgs): Promise<SwapRoute[]> {
    const routePath = this.#getShortestRoutePath({
      network,
      startToken: tokenToUse,
      targetToken: tokenToReceive,
    })

    if (routePath.length === 0) return []

    const { stack: reservesStack } = await this.#invokeReserves({ network, routePath })

    return this.#createSwapRoute({ network, routePath, reservesStack })
  }

  static createPoolGraph(network: Network<BSNeo3NetworkId>): PoolGraph {
    const poolGraph: PoolGraph = {}

    const pools = FlamingoSwapHelper.getFlamingoSwapPools(network)
    const tokens = FlamingoSwapHelper.getFlamingoSwapTokens(network)

    const { NEO, bNEO } = tokens

    // Initialize poolGraph with empty arrays
    Object.keys(tokens).forEach(tokenSymbol => {
      poolGraph[tokenSymbol] = []
    })

    // Add edges to poolGraph
    Object.values(pools).forEach(pool => {
      const tokenASymbol = pool.tokens[0].symbol
      const tokenBSymbol = pool.tokens[1].symbol

      poolGraph[tokenASymbol].push(tokenBSymbol)
      poolGraph[tokenBSymbol].push(tokenASymbol)
    })

    // Remove duplicates from poolGraph
    Object.keys(tokens).forEach(tokenSymbol => {
      poolGraph[tokenSymbol] = Array.from(new Set(poolGraph[tokenSymbol]))
    })

    // Include NEO to the poolGraph
    poolGraph[NEO.symbol] = Object.keys(tokens).filter(tokenSymbol => tokenSymbol === bNEO.symbol)

    // Include relationship between NEO and bNEO
    poolGraph[bNEO.symbol].push(NEO.symbol)

    return poolGraph
  }

  static async #invokeReserves({ network, routePath }: InvokeReservesArgs): Promise<InvokeResult> {
    const invoker = await NeonInvoker.init({
      rpcAddress: network.url,
    })

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)
    const routerScriptHash = scriptHashes.flamingoSwapRouter

    // Remove NEO token from the routePath because it's not supported by the router
    const routePathWithoutNeo = routePath.filter(
      route =>
        !FlamingoSwapHelper.isNeoToken(network, route.tokenToUse) &&
        !FlamingoSwapHelper.isNeoToken(network, route.tokenToReceive)
    )

    const getReservesContractInvocations = routePathWithoutNeo.map(route =>
      NeonDappKitInvocationBuilderNeo3.getReservesContractInvocation({
        routerScriptHash,
        tokenToUseHash: route.tokenToUse.hash,
        tokenToReceiveHash: route.tokenToReceive.hash,
      })
    )

    const getReservesContractInvocationMulti: ContractInvocationMulti = {
      invocations: [...getReservesContractInvocations],
    }

    return await invoker.testInvoke(getReservesContractInvocationMulti)
  }

  static #createSwapRoute({ network, routePath, reservesStack }: CreateSwapRouteArgs): SwapRoute[] {
    const isNeoTokenToUse = FlamingoSwapHelper.isNeoToken(network, routePath[0].tokenToUse)
    const isNeoTokenToReceive = FlamingoSwapHelper.isNeoToken(network, routePath[routePath.length - 1].tokenToReceive)

    const swapRoute: SwapRoute[] = []

    for (let index = 0; index < reservesStack.length; index++) {
      const item = reservesStack[index]

      if (
        !TypeChecker.isStackTypeArray(item) ||
        !TypeChecker.isStackTypeInteger(item.value[0]) ||
        !TypeChecker.isStackTypeInteger(item.value[1])
      ) {
        throw new Error('Invalid reserves response')
      }

      // Include NEO token in the swapRoute with 0 reserves because it wasn't supported by the router during the reserves invocation
      if (isNeoTokenToUse && index === 0) {
        swapRoute.push({
          tokenToUse: routePath[index].tokenToUse,
          reserveTokenToUse: '0',
          tokenToReceive: routePath[index].tokenToReceive,
          reserveTokenToReceive: '0',
        })

        index++
      }

      swapRoute.push({
        tokenToUse: routePath[index].tokenToUse,
        reserveTokenToUse: item.value[1].value,
        tokenToReceive: routePath[index].tokenToReceive,
        reserveTokenToReceive: item.value[0].value,
      })
    }

    // Include NEO token in the swapRoute with 0 reserves because it wasn't supported by the router during the reserves invocation
    if (isNeoTokenToReceive) {
      swapRoute.push({
        tokenToUse: routePath[routePath.length - 1].tokenToUse,
        reserveTokenToUse: '0',
        tokenToReceive: routePath[routePath.length - 1].tokenToReceive,
        reserveTokenToReceive: '0',
      })
    }

    return swapRoute
  }

  static #getShortestRoutePath({ network, startToken, targetToken }: GetShortestRoutePathArgs): RoutePath[] {
    // Initialize an empty object to track predecessors of each token
    const predecessor: Predecessor = {}

    // Create a graph representation of the token network
    const poolGraph = this.createPoolGraph(network)

    // Initialize the queue with the start token's symbol
    const queue: string[] = [startToken.symbol]

    // Track visited tokens, starting with the start token marked as visited
    const tokensVisited: TokensVisited = {
      [startToken.symbol]: true,
    }

    // Initialize an empty array to store the path of tokens
    let path: Token[] = []

    while (queue.length) {
      // Remove and get the first token symbol from the queue
      const currentTokenSymbol = queue.shift()
      if (!currentTokenSymbol) break

      const currentToken = FlamingoSwapHelper.getFlamingoSwapToken(network, currentTokenSymbol)
      if (!currentToken) continue

      // Get the neighbors of the current token from the graph
      const neighbours = poolGraph[currentToken.symbol]

      for (const neighbourSymbol of neighbours || []) {
        if (tokensVisited[neighbourSymbol]) continue // Skip if the neighbor has already been visited

        // Mark the neighbor token as visited
        tokensVisited[neighbourSymbol] = true

        // Record the current token as the predecessor of the neighbor token
        predecessor[neighbourSymbol] = currentToken

        // Add the neighbor token symbol to the queue
        queue.push(neighbourSymbol)

        if (neighbourSymbol === targetToken.symbol) {
          // Initialize the path with the target token
          path = [targetToken]

          // Start reconstructing the path from the target token back to the start token
          let prevToken = currentToken
          while (prevToken && prevToken.symbol !== startToken.symbol) {
            path.push(prevToken) // Add the predecessor token to the path
            prevToken = predecessor[prevToken.symbol] // Move to the predecessor token
          }

          // If the start token is reached, add it to the path and reverse the path to start-to-end order
          if (prevToken) {
            path.push(prevToken)
            path.reverse()
          }

          break
        }
      }

      if (path.length) break
    }

    const routePath: RoutePath[] = []

    // Convert the token path into route paths
    for (let i = 0; i < path.length - 1; i++) {
      routePath.push({ tokenToUse: path[i], tokenToReceive: path[i + 1] })
    }

    return routePath
  }
}
