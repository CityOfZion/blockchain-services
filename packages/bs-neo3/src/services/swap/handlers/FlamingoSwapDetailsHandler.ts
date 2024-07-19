import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import BigNumber from 'bignumber.js'
import { FlamingoSwapConstants } from '../../../constants/FlamingoSwapConstants'
import { BSNeo3NetworkId } from '../../../helpers/BSNeo3Helper'
import { FlamingoSwapHelper } from '../../../helpers/FlamingoSwapHelper'

type CalculateSwapDetailsArgs = {
  amountToUse: string | null
  amountToReceive: string | null
  tokenToUse: Token
  tokenToReceive: Token
  slippage: number
  network: Network<BSNeo3NetworkId>
  route: SwapRoute[]
}

type CalculateUsingAmountToReceiveArgs = {
  network: Network
  amountToReceive: string
  overrodeRoute: SwapRoute[]
  overrodeTokenToUse: Token
  overrodeTokenToReceive: Token
  slippageFormatted: BigNumber
}

type CalculateUsingAmountToUseArgs = {
  network: Network
  amountToUse: string
  overrodeRoute: SwapRoute[]
  overrodeTokenToUse: Token
  overrodeTokenToReceive: Token
  slippageFormatted: BigNumber
}

type FormatSwapDetailsArgs = {
  amountToReceiveToDisplay: string
  amountToUseToDisplay: string
  fee: BigNumber
  price: BigNumber
  priceImpact: BigNumber
  overrodeTokenToUse: Token
  overrodeTokenToReceive: Token
  slippageFormatted: BigNumber
  minimumReceived: string | null
  maximumSelling: string | null
}

type CreateTradeDataArgs = {
  amountToUse: BigNumber
  amountToReceive: BigNumber
  route: SwapRoute[]
}

type CalculateAmountToUseArgs = {
  amountToReceive: string
  route: SwapRoute[]
}

type CalculateAmountToReceiveArgs = {
  amountToUse: string
  route: SwapRoute[]
}

export class FlamingoSwapDetailsHandler {
  static calculateSwapDetails({
    amountToReceive,
    amountToUse,
    network,
    route,
    slippage,
    tokenToReceive,
    tokenToUse,
  }: CalculateSwapDetailsArgs) {
    const overrodeTokenToUse = FlamingoSwapHelper.overrideToken(network, tokenToUse)
    const overrodeTokenToReceive = FlamingoSwapHelper.overrideToken(network, tokenToReceive)
    const overrodeRoute = FlamingoSwapHelper.overrideRoute(network, route)

    const slippageFormatted = new BigNumber(slippage * 10).shiftedBy(-3)

    if (amountToReceive) {
      return this.#calculateUsingAmountToReceive({
        network,
        amountToReceive,
        overrodeRoute,
        overrodeTokenToUse,
        overrodeTokenToReceive,
        slippageFormatted,
      })
    } else if (amountToUse) {
      return this.#calculateUsingAmountToUse({
        network,
        amountToUse,
        overrodeRoute,
        overrodeTokenToUse,
        overrodeTokenToReceive,
        slippageFormatted,
      })
    } else {
      throw new Error('AmountToReceive or amountToUse are required, but both aren`t provided')
    }
  }

  static #calculateUsingAmountToReceive({
    network,
    amountToReceive,
    overrodeRoute,
    overrodeTokenToUse,
    overrodeTokenToReceive,
    slippageFormatted,
  }: CalculateUsingAmountToReceiveArgs) {
    const amountToReceiveBn = FlamingoSwapHelper.overrideAmountInput(network, amountToReceive, overrodeTokenToReceive)

    const amountToUse = this.#calculateAmountToUse({
      amountToReceive,
      route: overrodeRoute,
    })

    const amountToUseBn = new BigNumber(amountToUse)

    const maximumSelling = amountToUseBn
      .times(FlamingoSwapConstants.BN_1.plus(slippageFormatted))
      .dp(0)
      .shiftedBy(-overrodeTokenToUse.decimals)
      .toFixed()

    const amountToUseToDisplay = FlamingoSwapHelper.overrideAmountToDisplay(network, amountToUse, overrodeTokenToUse)

    const { fee, price, priceImpact } = this.#createTradeData({
      amountToReceive: amountToReceiveBn,
      amountToUse: amountToUseBn,
      route: overrodeRoute,
    })

    return this.#formatSwapDetails({
      amountToReceiveToDisplay: amountToReceive,
      amountToUseToDisplay,
      fee,
      price,
      priceImpact,
      overrodeTokenToUse,
      overrodeTokenToReceive,
      slippageFormatted,
      minimumReceived: null,
      maximumSelling,
    })
  }

  static #calculateUsingAmountToUse({
    network,
    amountToUse,
    overrodeRoute,
    overrodeTokenToUse,
    overrodeTokenToReceive,
    slippageFormatted,
  }: CalculateUsingAmountToUseArgs) {
    const amountToUseBn = FlamingoSwapHelper.overrideAmountInput(network, amountToUse, overrodeTokenToUse)

    const amountToReceive = this.#calculateAmountToReceive({
      amountToUse,
      route: overrodeRoute,
    })

    const amountToReceiveBn = new BigNumber(amountToReceive)

    const minimumReceived = amountToReceiveBn
      .times(FlamingoSwapConstants.BN_1.minus(slippageFormatted))
      .dp(0)
      .shiftedBy(-overrodeTokenToReceive.decimals)
      .toFixed()

    const amountToReceiveToDisplay = FlamingoSwapHelper.overrideAmountToDisplay(
      network,
      amountToReceiveBn.toString(),
      overrodeTokenToReceive
    )

    const { fee, price, priceImpact } = this.#createTradeData({
      amountToReceive: amountToReceiveBn,
      amountToUse: amountToUseBn,
      route: overrodeRoute,
    })

    return this.#formatSwapDetails({
      amountToReceiveToDisplay,
      amountToUseToDisplay: amountToUse,
      fee,
      price,
      priceImpact,
      overrodeTokenToUse,
      overrodeTokenToReceive,
      slippageFormatted,
      minimumReceived,
      maximumSelling: null,
    })
  }

  static #formatSwapDetails({
    amountToReceiveToDisplay,
    amountToUseToDisplay,
    fee,
    price,
    priceImpact,
    overrodeTokenToUse,
    overrodeTokenToReceive,
    minimumReceived,
    maximumSelling,
  }: FormatSwapDetailsArgs) {
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

  static #createTradeData({ amountToReceive, amountToUse, route }: CreateTradeDataArgs) {
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

  static #calculateAmountToUse({ amountToReceive, route }: CalculateAmountToUseArgs): string {
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

  static #calculateAmountToReceive({ amountToUse, route }: CalculateAmountToReceiveArgs): string {
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
}
