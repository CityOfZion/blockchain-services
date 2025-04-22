import axios, { AxiosInstance } from 'axios'
import {
  SimpleSwapApiCreateExchangeParams,
  SimpleSwapApiCreateExchangeResponse,
  SimpleSwapApiCurrency,
  SimpleSwapApiCurrencyResponse,
  SimpleSwapApiGetCurrenciesResponse,
  SimpleSwapApiGetEstimateResponse,
  SimpleSwapApiGetExchangeResponse,
  SimpleSwapApiGetPairsResponse,
  SimpleSwapApiGetRangeResponse,
  SimpleSwapServiceInitParams,
} from '../types/simpleSwap'
import { BlockchainService, hasExplorerService, normalizeHash } from '@cityofzion/blockchain-service'

export class SimpleSwapApi<BSName extends string = string> {
  readonly #tickersBySimpleSwapBlockchain: Partial<Record<string, Record<string, string>>> = {
    neo3: {
      neo3: 'neo',
      gasn3: 'gas',
    },
  }

  #axios: AxiosInstance
  #allCurrenciesMap: Map<string, SimpleSwapApiCurrency<BSName>> = new Map()

  constructor() {
    this.#axios = axios.create({ baseURL: 'https://dora.coz.io/api/v2/swap' })
  }

  #createAddressTemplateUrl(
    blockchainService: BlockchainService | undefined,
    explorer: string | null | undefined
  ): string | undefined {
    explorer = !explorer ? undefined : explorer.replace('{}', '{address}')

    if (blockchainService && hasExplorerService(blockchainService))
      return blockchainService.explorerService.getAddressTemplateUrl() ?? explorer

    return explorer
  }

  #createTxTemplateUrl(
    blockchainService: BlockchainService | undefined,
    explorer: string | null | undefined
  ): string | undefined {
    explorer = !explorer ? undefined : explorer.replace('{}', '{txId}')

    if (blockchainService && hasExplorerService(blockchainService))
      return blockchainService.explorerService.getTxTemplateUrl() ?? explorer

    return explorer
  }

  #getTokenFromCurrency(
    currency: SimpleSwapApiCurrencyResponse,
    options: SimpleSwapServiceInitParams<BSName>
  ): SimpleSwapApiCurrency<BSName> | undefined {
    const { network: simpleSwapBlockchain, ticker } = currency
    let { name } = currency
    let symbol = ticker

    if (!ticker || !simpleSwapBlockchain || !currency.image || !name || !currency.validationAddress) return

    const chainsByServiceNameEntries = Object.entries(options.chainsByServiceName) as [BSName, string[]][]

    const chainsByServiceNameEntry = chainsByServiceNameEntries.find(([_serviceName, chains]) =>
      chains.includes(simpleSwapBlockchain)
    )

    let blockchain: BSName | undefined
    let blockchainService: BlockchainService | undefined
    let decimals: number | undefined
    let hash = currency.contractAddress ?? undefined
    const normalizedHash = hash ? normalizeHash(hash) : ''
    const lowerCaseSymbol = symbol!.toLowerCase()
    const tickers = this.#tickersBySimpleSwapBlockchain[simpleSwapBlockchain]

    if (chainsByServiceNameEntry) {
      blockchain = chainsByServiceNameEntry[0]
      blockchainService = options.blockchainServicesByName[blockchain]

      const token = blockchainService.tokens.find(item => {
        if (normalizedHash && normalizedHash === normalizeHash(item.hash)) return true

        const currentLowerCaseSymbol = item.symbol.toLowerCase()

        if (!normalizedHash)
          return (
            lowerCaseSymbol === currentLowerCaseSymbol ||
            (!!tickers && currentLowerCaseSymbol === tickers[lowerCaseSymbol])
          )

        return false
      })

      if (token) {
        hash = token.hash
        decimals = token.decimals
        name = token.name
        symbol = token.symbol
      }
    }

    return {
      id: `${ticker}:${simpleSwapBlockchain}`,
      ticker,
      symbol: symbol!,
      network: simpleSwapBlockchain,
      name,
      imageUrl: currency.image,
      hash,
      decimals,
      hasExtraId: currency.hasExtraId,
      validationExtra: currency.validationExtra,
      validationAddress: currency.validationAddress,
      addressTemplateUrl: this.#createAddressTemplateUrl(blockchainService, currency.addressExplorer),
      txTemplateUrl: this.#createTxTemplateUrl(blockchainService, currency.txExplorer),
      blockchain,
    }
  }

  async getCurrencies(options: SimpleSwapServiceInitParams<BSName>): Promise<SimpleSwapApiCurrency<BSName>[]> {
    try {
      if (this.#allCurrenciesMap.size) {
        return Array.from(this.#allCurrenciesMap.values())
      }

      const response = await this.#axios.get<SimpleSwapApiGetCurrenciesResponse>('/currencies')

      const tokens: SimpleSwapApiCurrency<BSName>[] = []

      response.data.result.forEach(currency => {
        const token = this.#getTokenFromCurrency(currency, options)
        if (!token) return

        this.#allCurrenciesMap.set(`${token.ticker}:${token.network}`, token)

        if (!token.blockchain) return

        tokens.push(token)
      })

      return tokens
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }

  async getPairs(ticker: string, network: string) {
    try {
      const response = await this.#axios.get<SimpleSwapApiGetPairsResponse>(`/pairs/${ticker}/${network}`)
      const pairs = response.data.result[`${ticker}:${network}`] ?? []

      const tokens: SimpleSwapApiCurrency<BSName>[] = []

      pairs.forEach(pair => {
        const token = this.#allCurrenciesMap.get(pair)
        if (token) tokens.push(token)
      })

      return tokens
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }

  async getRange(currencyFrom: SimpleSwapApiCurrency, currencyTo: SimpleSwapApiCurrency) {
    try {
      const response = await this.#axios.get<SimpleSwapApiGetRangeResponse>('/ranges', {
        params: {
          tickerFrom: currencyFrom.ticker,
          tickerTo: currencyTo.ticker,
          networkFrom: currencyFrom.network,
          networkTo: currencyTo.network,
        },
      })
      return response.data.result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }

  async getEstimate(currencyFrom: SimpleSwapApiCurrency, currencyTo: SimpleSwapApiCurrency, amount: string) {
    try {
      const response = await this.#axios.get<SimpleSwapApiGetEstimateResponse>('/estimates', {
        params: {
          tickerFrom: currencyFrom.ticker,
          tickerTo: currencyTo.ticker,
          networkFrom: currencyFrom.network,
          networkTo: currencyTo.network,
          amount,
        },
      })

      return response.data.result.estimatedAmount
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }

  async createExchange({
    currencyFrom,
    currencyTo,
    amount,
    refundAddress,
    address,
    extraIdToReceive,
  }: SimpleSwapApiCreateExchangeParams) {
    try {
      const {
        data: { result },
      } = await this.#axios.post<SimpleSwapApiCreateExchangeResponse>('/exchanges', {
        tickerFrom: currencyFrom.ticker,
        networkFrom: currencyFrom.network,
        tickerTo: currencyTo.ticker,
        networkTo: currencyTo.network,
        amount,
        userRefundAddress: refundAddress,
        addressTo: address,
        extraIdTo: extraIdToReceive?.trim() ?? null,
      })

      return {
        id: result.id,
        depositAddress: result.addressFrom,
        log: JSON.stringify(result),
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }

  async getExchange(id: string) {
    try {
      const {
        data: { result },
      } = await this.#axios.get<SimpleSwapApiGetExchangeResponse>(`/exchanges/${id}`)

      return {
        status: result.status,
        txFrom: result.txFrom,
        txTo: result.txTo,
        log: JSON.stringify(result),
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data.message) {
        throw new Error(error.response.data.message)
      }

      throw error
    }
  }
}
