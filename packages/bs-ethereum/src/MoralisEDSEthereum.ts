import {
  BlockchainDataService,
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSEthereumHelper, BSEthereumNetworkId } from './BSEthereumHelper'
import { MoralisBDSEthereum } from './MoralisBDSEthereum'

type MoralisERC20MetadataResponse = {
  address: string
  name: string
  symbol: string
  decimals: string
  possible_spam: boolean
  verified_contract: boolean
}

type MoralisERC20PriceResponse = {
  tokenName: string
  tokenSymbol: string
  tokenDecimals: string
  usdPrice: number
  tokenAddress: string
}

type MoralisBlockResponse = {
  timestamp: string
}

export class MoralisEDSEthereum extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSEthereumNetworkId>
  readonly #blockchainDataService: BlockchainDataService
  readonly #numberOfBlockByHour = (15 / 60) * 60
  readonly #numberOfBlockByDay = this.#numberOfBlockByHour * 24

  constructor(network: Network<BSEthereumNetworkId>, blockchainDataService: BlockchainDataService) {
    super()

    this.#network = network
    this.#blockchainDataService = blockchainDataService
  }

  async #getWrappedNativeToken(): Promise<Token> {
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)
    const client = MoralisBDSEthereum.getClient(this.#network)
    const { data } = await client.get<MoralisERC20MetadataResponse[]>('/erc20/metadata/symbols', {
      params: {
        symbols: [`W${nativeToken.symbol}`],
      },
    })

    const wrapperToken = data.find(token => token.verified_contract && !token.possible_spam)
    if (!wrapperToken) throw new Error('Wrapper token not found')

    return {
      decimals: Number(wrapperToken.decimals),
      hash: wrapperToken.address,
      name: wrapperToken.name,
      symbol: wrapperToken.symbol,
    }
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#network)) throw new Error('Exchange is not supported on this network')

    const client = MoralisBDSEthereum.getClient(this.#network)
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)

    let wrappedNativeToken: Token | undefined
    if (params.tokens.some(token => token.symbol === nativeToken.symbol)) {
      wrappedNativeToken = await this.#getWrappedNativeToken()
    }

    const tokensBody = params.tokens.map(token => {
      if (token.symbol !== nativeToken.symbol) {
        return {
          token_address: token.hash,
        }
      }

      return {
        token_address: wrappedNativeToken!.hash,
      }
    })

    const { data } = await client.post<MoralisERC20PriceResponse[]>(`/erc20/prices`, {
      tokens: tokensBody,
    })

    return data.map(item => {
      let token: Token

      if (
        BSEthereumHelper.normalizeHash(item.tokenAddress) ===
        BSEthereumHelper.normalizeHash(wrappedNativeToken?.hash ?? '')
      ) {
        token = nativeToken
      } else {
        token = {
          decimals: Number(item.tokenDecimals),
          hash: item.tokenAddress,
          name: item.tokenName,
          symbol: item.tokenSymbol,
        }
      }

      return {
        usdPrice: item.usdPrice,
        token,
      }
    })
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#network)) throw new Error('Exchange is not supported on this network')

    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)

    let token: Token
    if (BSEthereumHelper.normalizeHash(params.token.hash) === BSEthereumHelper.normalizeHash(nativeToken.hash)) {
      token = await this.#getWrappedNativeToken()
    } else {
      token = params.token
    }

    const client = MoralisBDSEthereum.getClient(this.#network)
    const actualBlockNumber = (await this.#blockchainDataService.getBlockHeight()) - 1 // Last block is not included

    const history: TokenPricesHistoryResponse[] = []

    await Promise.allSettled(
      Array.from({ length: params.limit }).map(async (_, index) => {
        const block =
          actualBlockNumber - index * (params.type === 'hour' ? this.#numberOfBlockByHour : this.#numberOfBlockByDay)

        const priceResponse = await client.get<MoralisERC20PriceResponse>(`/erc20/${token.hash}/price`, {
          params: {
            to_block: block,
          },
        })

        const blockResponse = await client.get<MoralisBlockResponse>(`/block/${block}`)

        history.push({
          timestamp: new Date(blockResponse.data.timestamp).getTime(),
          usdPrice: priceResponse.data.usdPrice,
          token: params.token,
        })
      })
    )

    return history
  }
}
