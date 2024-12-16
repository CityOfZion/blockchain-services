import axios, { AxiosInstance } from 'axios'
import {
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
import { normalizeHash } from '@cityofzion/blockchain-service'

export class SimpleSwapApi<BSName extends string = string> {
  #axios: AxiosInstance
  #allCurrenciesMap: Map<string, SimpleSwapApiCurrency<BSName>> = new Map()

  constructor() {
    this.#axios = axios.create({ baseURL: 'https://4b6s1fv9b6.execute-api.us-east-1.amazonaws.com/Prod' })
  }

  #getTokenFromCurrency(
    currency: SimpleSwapApiCurrencyResponse,
    options: SimpleSwapServiceInitParams<BSName>
  ): SimpleSwapApiCurrency<BSName> | undefined {
    if (!currency.ticker || !currency.network || !currency.image || !currency.name || !currency.validationAddress) {
      return
    }

    const chainsByServiceNameEntries = Object.entries(options.chainsByServiceName) as [BSName, string[]][]

    const chainsByServiceNameEntry = chainsByServiceNameEntries.find(([_serviceName, chains]) =>
      chains.includes(currency.network!)
    )

    let hash = currency.contractAddress ?? undefined
    let decimals: number | undefined
    let name = currency.name
    let symbol = currency.ticker
    let blockchain: BSName | undefined

    if (chainsByServiceNameEntry) {
      blockchain = chainsByServiceNameEntry[0]

      const token = options.blockchainServicesByName[blockchain].tokens.find(
        item =>
          (hash && normalizeHash(hash) === normalizeHash(item.hash)) ||
          (currency.ticker && currency.ticker.toLowerCase().startsWith(item.symbol.toLowerCase()))
      )

      if (token) {
        hash = token.hash
        decimals = token.decimals
        name = token.name
        symbol = token.symbol
      }
    }

    return {
      id: `${currency.ticker}:${currency.network}`,
      ticker: currency.ticker,
      symbol,
      network: currency.network,
      name,
      imageUrl: currency.image,
      hash,
      decimals,
      validationAddress: currency.validationAddress,
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

  async createExchange(
    currencyTo: SimpleSwapApiCurrency,
    currencyFrom: SimpleSwapApiCurrency,
    amount: string,
    address: string,
    refundAddress: string
  ) {
    try {
      const {
        data: { result },
      } = await this.#axios.post<SimpleSwapApiCreateExchangeResponse>('/exchanges', {
        tickerFrom: currencyFrom.ticker,
        tickerTo: currencyTo.ticker,
        networkFrom: currencyFrom.network,
        networkTo: currencyTo.network,
        amount,
        addressTo: address,
        userRefundAddress: refundAddress,
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
