import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { FlamingoSwapNeonDappKitInvocationBuilder } from './FlamingoSwapNeonDappKitInvocationBuilder'
import { BSNeo3NetworkId } from '../BSNeo3Helper'
import { FlamingoSwapHelper } from './FlamingoSwapHelper'

type TokensVisited = {
  [tokenSymbol: string]: boolean
}

type Predecessor = {
  [tokenSymbol: string]: Token
}

type PoolGraph = Record<string, string[]>

type CalculateBestRouteForSwapArgs = {
  tokenToUse: Token
  tokenToReceive: Token
  network: Network<BSNeo3NetworkId>
}

export type RoutePath = {
  tokenToUse: Token
  tokenToReceive: Token
}

export class FlamingoSwapMultiInvoke {
  static async calculateBestRouteForSwap({
    tokenToUse,
    tokenToReceive,
    network,
  }: CalculateBestRouteForSwapArgs): Promise<SwapRoute[]> {
    const shortestRoute = this.getShortestRoutePath(network, tokenToUse, tokenToReceive)

    const swapRoute: SwapRoute[] = []

    if (shortestRoute.length === 0) {
      return swapRoute
    }

    const reserves = await this.calculateReserves(network, shortestRoute)

    reserves.map((_, index) => {
      const { tokenToUse, reserveTokenToUse, tokenToReceive, reserveTokenToReceive } = reserves[index]

      swapRoute.push({
        tokenToUse,
        reserveTokenToUse,
        tokenToReceive,
        reserveTokenToReceive,
      })
    })

    return swapRoute
  }

  static async calculateReserves(network: Network<BSNeo3NetworkId>, route: RoutePath[]): Promise<SwapRoute[]> {
    const invoker = await NeonInvoker.init({
      rpcAddress: network.url,
    })

    const invocation = FlamingoSwapNeonDappKitInvocationBuilder.getReservesInvocation({
      network,
      route,
    })

    const { stack } = await invoker.testInvoke(invocation)

    const isNeoTokenToUse = FlamingoSwapHelper.isNeoToken(network, route[0].tokenToUse)
    const isNeoTokenToReceive = FlamingoSwapHelper.isNeoToken(network, route[route.length - 1].tokenToReceive)

    const swapRoute: SwapRoute[] = []

    for (let index = 0; index < stack.length; index++) {
      const item = stack[index]

      if (
        !TypeChecker.isStackTypeArray(item) ||
        !TypeChecker.isStackTypeInteger(item.value[0]) ||
        !TypeChecker.isStackTypeInteger(item.value[1])
      )
        throw new Error('Invalid reserves response')

      if (isNeoTokenToUse && index === 0) {
        swapRoute.push({
          tokenToUse: route[index].tokenToUse,
          reserveTokenToUse: '0',
          tokenToReceive: route[index].tokenToReceive,
          reserveTokenToReceive: '0',
        })

        index++
      }

      swapRoute.push({
        tokenToUse: route[index].tokenToUse,
        reserveTokenToUse: item.value[1].value,
        tokenToReceive: route[index].tokenToReceive,
        reserveTokenToReceive: item.value[0].value,
      })
    }

    if (isNeoTokenToReceive) {
      swapRoute.push({
        tokenToUse: route[route.length - 1].tokenToUse,
        reserveTokenToUse: '0',
        tokenToReceive: route[route.length - 1].tokenToReceive,
        reserveTokenToReceive: '0',
      })
    }

    return swapRoute
  }

  static getShortestRoutePath(network: Network<BSNeo3NetworkId>, startToken: Token, targetToken: Token): RoutePath[] {
    const routePath: RoutePath[] = []
    const predecessor: Predecessor = {}
    const poolGraph = this.createPoolGraph(network)
    const queue: string[] = [startToken.symbol]
    const tokensVisited: TokensVisited = {
      [startToken.symbol]: true,
    }

    let path: Token[] = []

    while (queue.length) {
      const currentTokenSymbol = queue.shift()
      if (!currentTokenSymbol) break

      const currentToken = FlamingoSwapHelper.getFlamingoSwapToken(network, currentTokenSymbol)
      if (!currentToken) continue

      const neighbours = poolGraph[currentToken.symbol]

      for (const neighbourSymbol of neighbours || []) {
        if (tokensVisited[neighbourSymbol]) continue

        tokensVisited[neighbourSymbol] = true
        predecessor[neighbourSymbol] = currentToken
        queue.push(neighbourSymbol)

        if (neighbourSymbol === targetToken.symbol) {
          path = [targetToken]

          let prevToken = currentToken

          while (prevToken && prevToken.symbol !== startToken.symbol) {
            path.push(prevToken)
            prevToken = predecessor[prevToken.symbol]
          }

          if (prevToken) {
            path.push(prevToken)
            path.reverse()
          }

          break
        }
      }

      if (path.length) break
    }

    for (let i = 0; i < path.length - 1; i++) {
      routePath.push({ tokenToUse: path[i], tokenToReceive: path[i + 1] })
    }

    return routePath
  }

  static createPoolGraph(network: Network<BSNeo3NetworkId>): PoolGraph {
    const poolGraph: PoolGraph = {}

    const pools = FlamingoSwapHelper.getFlamingoSwapPools(network)
    const tokens = FlamingoSwapHelper.getFlamingoSwapTokens(network)

    // Initialize poolGraph with empty arrays
    Object.keys(tokens).forEach(tokenSymbol => {
      poolGraph[tokenSymbol] = []
    })

    // Add edges to poolGraph
    Object.values(pools).forEach(pool => {
      const tokenA = pool.tokens[0].symbol
      const tokenB = pool.tokens[1].symbol
      poolGraph[tokenA].push(tokenB)
      poolGraph[tokenB].push(tokenA)
    })

    // Remove duplicates from poolGraph
    Object.keys(tokens).forEach(tokenSymbol => {
      poolGraph[tokenSymbol] = Array.from(new Set(poolGraph[tokenSymbol]))
    })

    const NEO = tokens['NEO']
    const bNEO = tokens['bNEO']

    // Include NEO to the poolGraph
    poolGraph[NEO.symbol] = Object.keys(tokens).filter(tokenSymbol => tokenSymbol === bNEO.symbol)

    // Include relationship between NEO and bNEO
    poolGraph[bNEO.symbol].push(NEO.symbol)

    return poolGraph
  }

  static listSwappableTokens(network: Network<BSNeo3NetworkId>): string[] {
    const poolGraph: Record<string, string[]> = {}

    const pools = FlamingoSwapHelper.getFlamingoSwapPools(network)
    const tokens = FlamingoSwapHelper.getFlamingoSwapTokens(network)

    // Initialize poolGraph with empty arrays
    Object.values(tokens).forEach(token => {
      poolGraph[token.hash] = []
    })

    // Add edges to poolGraph
    Object.values(pools).forEach(pool => {
      const tokenA = pool.tokens[0].hash
      const tokenB = pool.tokens[1].hash
      poolGraph[tokenA].push(tokenB)
      poolGraph[tokenB].push(tokenA)
    })

    // Remove duplicates from poolGraph
    Object.values(tokens).forEach(token => {
      poolGraph[token.hash] = Array.from(new Set(poolGraph[token.hash]))
    })

    const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')

    // Remove tokens without pairs
    Object.keys(poolGraph).forEach(key => {
      if (key === NEO.hash) return

      if (poolGraph[key].length === 0) {
        delete poolGraph[key]
      }
    })

    return Object.keys(poolGraph)
  }
}
