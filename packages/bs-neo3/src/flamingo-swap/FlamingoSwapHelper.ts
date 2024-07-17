import BigNumber from 'bignumber.js'
import { Network, SwapRoute, Token } from '@cityofzion/blockchain-service'
import { BSNeo3NetworkId } from '../BSNeo3Helper'

type TGetSwapArgs = {
  amountToUse: string | null
  amountToReceive: string | null
  tokenToUse: Token
  tokenToReceive: Token
  reservesToUse: string
  reservesToReceive: string
  slippage: number
  network: Network<BSNeo3NetworkId>
}

type TCreateTradeDataArgs = {
  amountToUse: BigNumber
  amountToReceive: BigNumber
  route: SwapRoute[]
}

export type SwapScriptHashes = {
  flamingoSwapRouter: string
  flamingoPairWhiteList: string
  flamingoFactory: string
  neo: string
  gas: string
  bneo: string
  flpBneoGas: string
}

export class FlamingoSwapHelper {
  static readonly BN_0 = new BigNumber(0)

  static readonly BN_1 = new BigNumber(1)

  static readonly BN_997 = new BigNumber(997)

  static readonly BN_1000 = new BigNumber(1000)

  static readonly FEE_RATE = new BigNumber(0.003)

  static readonly GAS_PER_NEO = 0.001

  static readonly #SWAP_SCRIPT_HASHES_BY_NETWORK_ID: Partial<Record<BSNeo3NetworkId, SwapScriptHashes>> = {
    mainnet: {
      flamingoSwapRouter: '0xf970f4ccecd765b63732b821775dc38c25d74f23',
      flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
      flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
      gas: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      neo: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      bneo: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
      flpBneoGas: '0x3244fcadcccff190c329f7b3083e4da2af60fbce',
    },
    testnet: {
      flamingoSwapRouter: '0x6f0910fa26290f4a423930c8f833395790c71705',
      flamingoPairWhiteList: '0xfb75a5314069b56e136713d38477f647a13991b4',
      flamingoFactory: '0xca2d20610d7982ebe0bed124ee7e9b2d580a6efc',
      gas: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      neo: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      bneo: '0x85deac50febfd93988d3f391dea54e8289e43e9e',
      flpBneoGas: '0x3244fcadcccff190c329f7b3083e4da2af60fbce',
    },
  }

  static readonly #BNEO_TOKEN_BY_NETWORK_ID: Partial<Record<BSNeo3NetworkId, Token>> = {
    mainnet: {
      symbol: 'bNEO',
      hash: '0x48c40d4666f93408be1bef038b6722404d9a4c2a',
      decimals: 8,
      name: 'BurgerNEO',
    },
    testnet: {
      symbol: 'bNEO',
      hash: '0x85deac50febfd93988d3f391dea54e8289e43e9e',
      decimals: 8,
      name: 'BurgerNEO',
    },
  }

  static getSwapScriptHashes(network: Network<BSNeo3NetworkId>) {
    const hashes = this.#SWAP_SCRIPT_HASHES_BY_NETWORK_ID[network.id]
    if (!hashes) throw new Error('Unsupported network')
    return hashes
  }

  static getBneoToken(network: Network<BSNeo3NetworkId>) {
    const token = this.#BNEO_TOKEN_BY_NETWORK_ID[network.id]
    if (!token) throw new Error('Unsupported network')
    return token
  }

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

  static overrideToken(network: Network<BSNeo3NetworkId>, token: Token): Token {
    const scriptHashes = this.getSwapScriptHashes(network)
    const isNeoToken = this.normalizeHash(token.hash) === this.normalizeHash(scriptHashes.neo)

    if (!isNeoToken) {
      return token
    }

    const bneoToken = this.getBneoToken(network)
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

  private static overrideAmountInput(network: Network<BSNeo3NetworkId>, amount: string, token: Token) {
    const tokenOverrode = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(tokenOverrode.decimals)
  }

  private static overrideAmountToDisplay(network: Network<BSNeo3NetworkId>, amount: string, token: Token) {
    const tokenOverrode = this.overrideToken(network, token)

    return new BigNumber(amount).shiftedBy(-tokenOverrode.decimals).toFixed()
  }

  private static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
