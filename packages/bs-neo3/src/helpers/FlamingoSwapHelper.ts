import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import { u } from '@cityofzion/neon-core'
import BigNumber from 'bignumber.js'
import {
  FlamingoSwapConstants,
  FlamingoSwapPoolInfo,
  FlamingoSwapPools,
  FlamingoSwapScriptHashes,
  FlamingoSwapTokens,
} from '../constants/FlamingoSwapConstants'
import { BSNeo3NetworkId } from './BSNeo3Helper'

export class FlamingoSwapHelper {
  static getFlamingoSwapPools(network: Network<BSNeo3NetworkId>): FlamingoSwapPools {
    const pools = FlamingoSwapConstants.FLAMINGO_SWAP_POOLS[network.id]
    if (!pools) {
      throw new Error('Invalid network')
    }

    return pools
  }

  static getFlamingoSwapPool(network: Network<BSNeo3NetworkId>, name: string): FlamingoSwapPoolInfo {
    const pools = this.getFlamingoSwapPools(network)
    const pool = pools[name]
    if (!pool) {
      throw new Error('Invalid pool')
    }

    return pool
  }

  static getFlamingoSwapTokens(network: Network<BSNeo3NetworkId>): FlamingoSwapTokens {
    const tokens = FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]
    if (!tokens) {
      throw new Error('Invalid network')
    }

    return tokens
  }

  static getFlamingoSwapToken(network: Network<BSNeo3NetworkId>, name: string): Token {
    const tokens = this.getFlamingoSwapTokens(network)
    const token = tokens[name]
    if (!token) {
      throw new Error('Invalid token')
    }

    return token
  }

  static getFlamingoSwapScriptHashes(network: Network<BSNeo3NetworkId>): FlamingoSwapScriptHashes {
    const swapScriptHashes = FlamingoSwapConstants.FLAMINGO_SWAP_SCRIPT_HASHES[network.id]
    if (!swapScriptHashes) {
      throw new Error('Invalid network')
    }

    return swapScriptHashes
  }

  static getRoutePath(route: SwapRoute[]): Token[] {
    return route
      .flatMap(item => [item.tokenToUse, item.tokenToReceive])
      .filter((item, index, arr) => arr.indexOf(item) === index)
  }

  static overrideToken(network: Network<BSNeo3NetworkId>, token: Token): Token {
    return this.isNeoToken(network, token) ? this.getFlamingoSwapToken(network, 'bNEO') : token
  }

  static overrideAmountInput(network: Network<BSNeo3NetworkId>, amount: string, token: Token): BigNumber {
    const overrodeToken = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(overrodeToken.decimals)
  }

  static overrideAmountToDisplay(network: Network<BSNeo3NetworkId>, amount: string, token: Token): string {
    const overrodeToken = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(-overrodeToken.decimals).toFixed()
  }

  static overrideRoute(network: Network<BSNeo3NetworkId>, route: SwapRoute[]): SwapRoute[] {
    const overrodeRoute: SwapRoute[] = []

    for (const routeItem of route) {
      if (!this.isNeoToken(network, routeItem.tokenToUse) && !this.isNeoToken(network, routeItem.tokenToReceive)) {
        overrodeRoute.push(routeItem)
      }
    }

    return overrodeRoute
  }

  static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }

  static isNeoToken(network: Network<BSNeo3NetworkId>, token: Token): boolean {
    const NEO = this.getFlamingoSwapToken(network, 'NEO')

    return this.normalizeHash(token.hash) === this.normalizeHash(NEO.hash)
  }

  static formatAmount(amount: string, decimals: number): string {
    return u.BigInteger.fromDecimal(Number(amount), decimals).toString()
  }
}
