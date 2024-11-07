import { BlockchainService } from '@cityofzion/blockchain-service'
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

export class SimpleSwapApi<BSName extends string = string> {
  #axios: AxiosInstance
  #allCurrenciesMap: Map<string, SimpleSwapApiCurrency<BSName>> = new Map()
  #chainsByServiceNameEntries: [BSName, string[]][]
  #blockchainServicesByName: Record<BSName, BlockchainService<BSName>>

  constructor({ apiKey, blockchainServicesByName, chainsByServiceName }: SimpleSwapServiceInitParams<BSName>) {
    this.#axios = axios.create({ baseURL: 'https://api.simpleswap.io/v3', headers: { 'X-API-KEY': apiKey } })
    this.#chainsByServiceNameEntries = Object.entries(chainsByServiceName) as [BSName, string[]][]
    this.#blockchainServicesByName = blockchainServicesByName
  }

  #getTokenFromCurrency(currency: SimpleSwapApiCurrencyResponse): SimpleSwapApiCurrency<BSName> | undefined {
    if (!currency.ticker || !currency.network || !currency.image || !currency.name || !currency.validationAddress) {
      return
    }

    const chainsByServiceNameEntry = this.#chainsByServiceNameEntries.find(([_serviceName, chains]) =>
      chains.includes(currency.network!)
    )
    let hash = currency.contractAddress ?? undefined
    let decimals: number | undefined
    let name = currency.name
    let symbol = currency.ticker
    let blockchain: BSName | undefined

    if (chainsByServiceNameEntry) {
      blockchain = chainsByServiceNameEntry[0]

      if (!hash) {
        const token = this.#blockchainServicesByName[blockchain].tokens.find(
          token => currency.ticker?.toLowerCase().startsWith(token.symbol.toLowerCase())
        )

        if (token) {
          hash = token.hash
          decimals = token.decimals
          name = token.name
          symbol = token.symbol
        }
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

  async getCurrencies() {
    if (this.#allCurrenciesMap.size) {
      return Array.from(this.#allCurrenciesMap.values())
    }

    const response = await this.#axios.get<SimpleSwapApiGetCurrenciesResponse>('/currencies')

    const tokens: SimpleSwapApiCurrency<BSName>[] = []

    response.data.result.forEach(currency => {
      const token = this.#getTokenFromCurrency(currency)
      if (!token) return

      this.#allCurrenciesMap.set(`${token.ticker}:${token.network}`, token)

      if (!token.blockchain) return

      tokens.push(token)
    })

    return tokens
  }

  async getPairs(ticker: string, network: string) {
    const response = await this.#axios.get<SimpleSwapApiGetPairsResponse>(`/pairs/${ticker}/${network}`)
    const pairs = response.data.result[`${ticker}:${network}`] ?? []

    const tokens: SimpleSwapApiCurrency<BSName>[] = []

    pairs.forEach(pair => {
      const token = this.#allCurrenciesMap.get(pair)
      if (token) tokens.push(token)
    })

    return tokens
  }

  async getRange(currencyFrom: SimpleSwapApiCurrency, currencyTo: SimpleSwapApiCurrency) {
    const response = await this.#axios.get<SimpleSwapApiGetRangeResponse>('/ranges', {
      params: {
        tickerFrom: currencyFrom.ticker,
        tickerTo: currencyTo.ticker,
        networkFrom: currencyFrom.network,
        networkTo: currencyTo.network,
      },
    })
    return response.data.result
  }

  async getEstimate(currencyFrom: SimpleSwapApiCurrency, currencyTo: SimpleSwapApiCurrency, amount: string) {
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
  }

  async createExchange(
    currencyTo: SimpleSwapApiCurrency,
    currencyFrom: SimpleSwapApiCurrency,
    amount: string,
    address: string,
    refundAddress: string
  ) {
    const response = await this.#axios.post<SimpleSwapApiCreateExchangeResponse>('/exchanges', {
      tickerFrom: currencyFrom.ticker,
      tickerTo: currencyTo.ticker,
      networkFrom: currencyFrom.network,
      networkTo: currencyTo.network,
      amount,
      addressTo: address,
      userRefundAddress: refundAddress,
    })

    return {
      id: response.data.result.id,
      depositAddress: response.data.result.addressFrom,
    }
  }

  async getExchange(id: string) {
    const response = await this.#axios.get<SimpleSwapApiGetExchangeResponse>(`/exchanges/${id}`)

    return {
      status: response.data.result.status,
      txFrom: response.data.result.txFrom,
      txTo: response.data.result.txTo,
    }
  }
}