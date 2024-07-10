import BigNumber from 'bignumber.js'
import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import { AvailableNetworkIds, SWAP_SCRIPT_HASHES_BY_NETWORK_TYPE, TOKENS } from '../constants'

type TGetSwapArgs = {
  amountToUse: string | null
  amountToReceive: string | null
  tokenToUse: Token
  tokenToReceive: Token
  reservesToUse: string
  reservesToReceive: string
  slippage: number
  network: Network<AvailableNetworkIds>
}

type TCreateTradeDataArgs = {
  amountToUse: BigNumber
  amountToReceive: BigNumber
  route: SwapRoute[]
}

export class FlamingoSwapHelper {
  static readonly BN_0 = new BigNumber(0)
  static readonly BN_1 = new BigNumber(1)
  static readonly BN_997 = new BigNumber(997)
  static readonly BN_1000 = new BigNumber(1000)
  static readonly FEE_RATE = new BigNumber(0.003)

  static getSwapFields(params: TGetSwapArgs) {
    const reservesToUseBn = new BigNumber(params.reservesToUse)
    const reservesToReceiveBn = new BigNumber(params.reservesToReceive)

    if (reservesToUseBn.lt(this.BN_0) || reservesToReceiveBn.lt(this.BN_0)) {
      throw new Error('Reserve should be positive number')
    }

    let amountToUseBn: BigNumber
    let amountToReceiveBn: BigNumber
    let amountToUseToDisplay: string
    let amountToReceiveToDisplay: string
    let maximumSelling: string | null = null
    let minimumReceived: string | null = null

    const slippageFormatted = new BigNumber(params.slippage * 10).shiftedBy(-3)

    if (params.amountToReceive) {
      amountToReceiveBn = this.overrideAmountInput(params.network, params.amountToReceive, params.tokenToReceive)

      amountToUseBn = reservesToUseBn
        .times(amountToReceiveBn)
        .times(this.BN_1000)
        .idiv(reservesToReceiveBn.minus(amountToReceiveBn).times(this.BN_997))
        .plus(this.BN_1)

      maximumSelling = amountToUseBn
        .times(this.BN_1.plus(slippageFormatted))
        .dp(0)
        .shiftedBy(-params.tokenToUse.decimals)
        .toFixed()

      amountToUseToDisplay = this.overrideAmountToDisplay(params.network, amountToUseBn.toFixed(), params.tokenToUse)
      amountToReceiveToDisplay = params.amountToReceive
    } else if (params.amountToUse) {
      amountToUseBn = this.overrideAmountInput(params.network, params.amountToUse, params.tokenToUse)

      const amountToUseWithFee = amountToUseBn.times(this.BN_997)

      amountToReceiveBn = amountToUseWithFee
        .times(params.reservesToReceive)
        .idiv(reservesToUseBn.times(this.BN_1000).plus(amountToUseWithFee))

      minimumReceived = amountToReceiveBn
        .times(this.BN_1.minus(slippageFormatted))
        .dp(0)
        .shiftedBy(-params.tokenToReceive.decimals)
        .toFixed()

      amountToReceiveToDisplay = this.overrideAmountToDisplay(
        params.network,
        amountToReceiveBn.toString(),
        params.tokenToReceive
      )
      amountToUseToDisplay = params.amountToUse
    } else {
      throw new Error('AmountToReceive or amountToUse are required, but both aren`t provided')
    }

    const route: SwapRoute[] = [
      {
        assetToUseSymbol: this.overrideToken(params.network, params.tokenToUse).symbol,
        reservesToReceive: params.reservesToReceive,
        assetToReceiveSymbol: this.overrideToken(params.network, params.tokenToReceive).symbol,
        reservesToUse: params.reservesToUse,
      },
    ]

    const { fee, price, priceImpact } = this.createTradeData({
      amountToReceive: amountToReceiveBn,
      amountToUse: amountToUseBn,
      route,
    })
    const priceInverse = this.BN_1.div(price)
    const diffDecimals = params.tokenToUse.decimals - params.tokenToReceive.decimals

    return {
      amountToReceiveToDisplay,
      amountToUseToDisplay,
      liquidityProviderFee: fee.shiftedBy(-8).plus(this.BN_0).toFixed(4),
      priceImpact: isFinite(Number(priceImpact)) ? priceImpact.shiftedBy(2).toFixed(4) : null,
      priceInverse: isFinite(Number(priceInverse)) ? priceInverse.multipliedBy(10 ** diffDecimals).toFixed() : null,
      minimumReceived,
      maximumSelling,
    }
  }

  static overrideToken(network: Network<AvailableNetworkIds>, token: Token): Token {
    const neoScriptHash = SWAP_SCRIPT_HASHES_BY_NETWORK_TYPE[network.id]!.neo

    const isNeoToken = this.normalizeHash(token.hash) === this.normalizeHash(neoScriptHash)

    if (!isNeoToken) {
      return token
    }

    const bneoToken = TOKENS[network.id].find(
      token => token.hash === SWAP_SCRIPT_HASHES_BY_NETWORK_TYPE[network.id]!.bneo
    )
    if (!bneoToken) throw new Error('Bneo token not found')

    return bneoToken
  }

  private static createTradeData({ amountToUse, amountToReceive, route }: TCreateTradeDataArgs) {
    const fee = amountToUse.minus(
      route.reduce((acc: BigNumber) => acc.times(this.BN_1.minus(this.FEE_RATE)), amountToUse)
    )

    const price = amountToUse.div(amountToReceive)
    const midPrice = route.reduce((acc, item) => acc.times(item.reservesToUse).div(item.reservesToReceive), this.BN_1)
    const priceImpact = price.minus(midPrice).div(price).minus(fee.div(amountToUse))

    return {
      fee,
      price,
      priceImpact,
      midPrice,
    }
  }

  private static overrideAmountInput(network: Network<AvailableNetworkIds>, amount: string, token: Token) {
    const tokenOverrode = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(tokenOverrode.decimals)
  }

  private static overrideAmountToDisplay(network: Network<AvailableNetworkIds>, amount: string, token: Token) {
    const tokenOverrode = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(-tokenOverrode.decimals).toFixed()
  }

  private static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
