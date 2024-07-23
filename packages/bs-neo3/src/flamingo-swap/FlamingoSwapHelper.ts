import BigNumber from 'bignumber.js'
import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import {
  FlamingoSwapConstants,
  FlamingoSwapPoolInfo,
  FlamingoSwapPools,
  FlamingoSwapScriptHashes,
  FlamingoSwapTokens,
} from './FlamingoSwapConstants'
import { BSNeo3NetworkId } from '../BSNeo3Helper'

export type GetSwapFieldsArgs = {
  amountToUse: string | null
  amountToReceive: string | null
  tokenToUse: Token
  tokenToReceive: Token
  slippage: number
  network: Network<BSNeo3NetworkId>
  route: SwapRoute[]
}

export type GetSwapFieldsResponse = {
  amountToReceiveToDisplay: string
  amountToUseToDisplay: string
  liquidityProviderFee: any
  priceImpact: any
  priceInverse: string | null
  minimumReceived: string | null
  maximumSelling: string | null
}

export type CalculateAmountToUseArgs = {
  amountToReceive: string
  route: SwapRoute[]
}

export type CalculateAmountToReceiveArgs = {
  amountToUse: string
  route: SwapRoute[]
}

export type CreateTradeDataArgs = {
  amountToUse: BigNumber
  amountToReceive: BigNumber
  route: SwapRoute[]
}

export type CreateTradeDataResponse = {
  fee: BigNumber
  price: BigNumber
  priceImpact: BigNumber
  midPrice: BigNumber
}

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

  static getSwapFields({
    amountToReceive,
    amountToUse,
    network,
    route,
    slippage,
    tokenToReceive,
    tokenToUse,
  }: GetSwapFieldsArgs): GetSwapFieldsResponse {
    const overrodeTokenToUse = this.overrideToken(network, tokenToUse)
    const overrodeTokenToReceive = this.overrideToken(network, tokenToReceive)
    const overrodeRoute = this.overrideRoute(network, route)

    let amountToUseBn: BigNumber
    let amountToReceiveBn: BigNumber
    let amountToUseToDisplay: string
    let amountToReceiveToDisplay: string
    let maximumSelling: string | null = null
    let minimumReceived: string | null = null

    const slippageFormatted = new BigNumber(slippage * 10).shiftedBy(-3)

    if (amountToReceive) {
      amountToReceiveBn = this.overrideAmountInput(network, amountToReceive, overrodeTokenToReceive)

      const amountToUse = this.calculateAmountToUse({
        amountToReceive,
        route: overrodeRoute,
      })

      amountToUseBn = new BigNumber(amountToUse)

      maximumSelling = amountToUseBn
        .times(FlamingoSwapConstants.BN_1.plus(slippageFormatted))
        .dp(0)
        .shiftedBy(-overrodeTokenToUse.decimals)
        .toFixed()

      amountToUseToDisplay = this.overrideAmountToDisplay(network, amountToUse, overrodeTokenToUse)

      amountToReceiveToDisplay = amountToReceive
    } else if (amountToUse) {
      amountToUseBn = this.overrideAmountInput(network, amountToUse, overrodeTokenToUse)

      const amountToReceive = this.calculateAmountToReceive({
        amountToUse,
        route: overrodeRoute,
      })

      amountToReceiveBn = new BigNumber(amountToReceive)

      minimumReceived = amountToReceiveBn
        .times(FlamingoSwapConstants.BN_1.minus(slippageFormatted))
        .dp(0)
        .shiftedBy(-overrodeTokenToReceive.decimals)
        .toFixed()

      amountToReceiveToDisplay = this.overrideAmountToDisplay(
        network,
        amountToReceiveBn.toString(),
        overrodeTokenToReceive
      )

      amountToUseToDisplay = amountToUse
    } else {
      throw new Error('AmountToReceive or amountToUse are required, but both aren`t provided')
    }

    const { fee, price, priceImpact } = this.createTradeData({
      amountToReceive: amountToReceiveBn,
      amountToUse: amountToUseBn,
      route: overrodeRoute,
    })
    const priceInverse = FlamingoSwapConstants.BN_1.div(price)
    const diffDecimals = overrodeTokenToUse.decimals - overrodeTokenToReceive.decimals

    return {
      amountToReceiveToDisplay,
      amountToUseToDisplay,
      liquidityProviderFee: fee.shiftedBy(-8).plus(FlamingoSwapConstants.BN_0).toFixed(4),
      priceImpact: isFinite(Number(priceImpact)) ? priceImpact.shiftedBy(2).toFixed(4) : null,
      priceInverse: isFinite(Number(priceInverse)) ? priceInverse.multipliedBy(10 ** diffDecimals).toFixed() : null,
      minimumReceived,
      maximumSelling,
    }
  }

  static calculateAmountToUse({ amountToReceive, route }: CalculateAmountToUseArgs): string {
    let amountToUse: string = ''

    let tempAmountToReceive = amountToReceive

    route
      .reverse()
      .map(
        (
          {
            tokenToUse: tradeTokenToUse,
            tokenToReceive: tradeTokenToReceive,
            reserveTokenToUse,
            reserveTokenToReceive,
          },
          index
        ) => {
          if (amountToUse) {
            tempAmountToReceive = amountToUse
          }

          const reserveTokenToUseBn = new BigNumber(reserveTokenToUse)
          const reserveTokenToReceiveBn = new BigNumber(reserveTokenToReceive)

          const tempAmountToReceiveBn = new BigNumber(tempAmountToReceive).shiftedBy(tradeTokenToReceive.decimals)

          amountToUse = reserveTokenToUseBn
            .times(tempAmountToReceiveBn)
            .times(1000)
            .idiv(reserveTokenToReceiveBn.minus(tempAmountToReceiveBn).times(997))
            .plus(1)
            .toFixed()

          if (route.length > 1) {
            amountToUse = new BigNumber(amountToUse).shiftedBy(-tradeTokenToUse.decimals).toFixed()

            if (index === route.length - 1) {
              amountToUse = new BigNumber(amountToUse).shiftedBy(tradeTokenToUse.decimals).toFixed()
            }
          }
        }
      )

    return amountToUse
  }

  static calculateAmountToReceive({ amountToUse, route }: CalculateAmountToReceiveArgs): string {
    let amountToReceive: string = ''

    let tempAmountToUse = amountToUse

    route.map(
      (
        { tokenToUse: tradeTokenToUse, tokenToReceive: tradeTokenToReceive, reserveTokenToUse, reserveTokenToReceive },
        index
      ) => {
        if (amountToReceive) {
          tempAmountToUse = amountToReceive
        }

        const reserveTokenToUseBn = new BigNumber(reserveTokenToUse)

        const tempAmountToUseWithFee = new BigNumber(tempAmountToUse).times(997).shiftedBy(tradeTokenToUse.decimals)

        amountToReceive = tempAmountToUseWithFee
          .times(reserveTokenToReceive)
          .idiv(reserveTokenToUseBn.times(1000).plus(tempAmountToUseWithFee))
          .toFixed()

        if (route.length > 1) {
          amountToReceive = new BigNumber(amountToReceive).shiftedBy(-tradeTokenToReceive.decimals).toFixed()

          if (index === route.length - 1) {
            amountToReceive = new BigNumber(amountToReceive).shiftedBy(tradeTokenToReceive.decimals).toFixed()
          }
        }
      }
    )

    return amountToReceive
  }

  static createTradeData({ amountToReceive, amountToUse, route }: CreateTradeDataArgs): CreateTradeDataResponse {
    const fee = amountToUse.minus(
      route.reduce(acc => acc.times(FlamingoSwapConstants.BN_1.minus(FlamingoSwapConstants.FEE_RATE)), amountToUse)
    )

    const price = amountToUse.div(amountToReceive)
    const midPrice = route.reduce(
      (acc, item) => acc.times(item.reserveTokenToUse).div(item.reserveTokenToReceive),
      FlamingoSwapConstants.BN_1
    )
    const priceImpact = price.minus(midPrice).div(price).minus(fee.div(amountToUse))

    return {
      fee,
      price,
      priceImpact,
      midPrice,
    }
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
}
