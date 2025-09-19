import axios, { AxiosInstance } from 'axios'
import {
  TSimpleSwapApiCreateExchangeParams,
  TSimpleSwapApiCreateExchangeResponse,
  TSimpleSwapApiCurrency,
  TSimpleSwapApiCurrencyResponse,
  TSimpleSwapApiGetCurrenciesResponse,
  TSimpleSwapApiGetEstimateResponse,
  TSimpleSwapApiGetExchangeResponse,
  TSimpleSwapApiGetPairsResponse,
  TSimpleSwapApiGetRangeResponse,
  TSimpleSwapOrchestratorInitParams,
} from './types'
import { IBlockchainService, BSCommonConstants, hasExplorerService } from '@cityofzion/blockchain-service'

export class SimpleSwapApi<N extends string> {
  readonly #tickersBySimpleSwapBlockchain: Partial<Record<string, Record<string, string>>> = {
    neo3: {
      neo3: 'neo',
      gasn3: 'gas',
    },
  }

  #apiInstance?: AxiosInstance
  #allCurrenciesMap: Map<string, TSimpleSwapApiCurrency<N>> = new Map()

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = axios.create({
        baseURL: `${BSCommonConstants.DORA_URL}/api/v2/swap`,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })
    }

    return this.#apiInstance
  }

  #createAddressTemplateUrl(
    blockchainService: IBlockchainService | undefined,
    explorer: string | null | undefined
  ): string | undefined {
    explorer = !explorer ? undefined : explorer.replace('{}', '{address}')

    if (blockchainService && hasExplorerService(blockchainService))
      return blockchainService.explorerService.getAddressTemplateUrl() ?? explorer

    return explorer
  }

  #createTxTemplateUrl(
    blockchainService: IBlockchainService | undefined,
    explorer: string | null | undefined
  ): string | undefined {
    explorer = !explorer ? undefined : explorer.replace('{}', '{txId}')

    if (blockchainService && hasExplorerService(blockchainService))
      return blockchainService.explorerService.getTxTemplateUrl() ?? explorer

    return explorer
  }

  #getTokenFromCurrency(
    currency: TSimpleSwapApiCurrencyResponse,
    options: TSimpleSwapOrchestratorInitParams<N>
  ): TSimpleSwapApiCurrency<N> | undefined {
    const { network: simpleSwapBlockchain, ticker, precision } = currency

    let { name } = currency
    let symbol = ticker

    if (!ticker || !simpleSwapBlockchain || !currency.image || !name || !currency.validationAddress) return

    const chainsByServiceNameEntries = Object.entries(options.chainsByServiceName) as [N, string[]][]

    const chainsByServiceNameEntry = chainsByServiceNameEntries.find(([_serviceName, chains]) =>
      chains.includes(simpleSwapBlockchain)
    )

    let blockchain: N | undefined
    let blockchainService: IBlockchainService | undefined
    let decimals = precision ?? undefined
    let hash = currency.contractAddress ?? undefined
    const lowerCaseSymbol = symbol!.toLowerCase()
    const tickers = this.#tickersBySimpleSwapBlockchain[simpleSwapBlockchain]

    if (chainsByServiceNameEntry) {
      blockchain = chainsByServiceNameEntry[0]
      blockchainService = options.blockchainServicesByName[blockchain]
      const normalizedHash = hash && blockchainService ? blockchainService.tokenService.normalizeHash(hash) : ''

      const token = blockchainService?.tokens.find(item => {
        if (normalizedHash && blockchainService && blockchainService.tokenService.predicateByHash(item, normalizedHash))
          return true

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

  async getCurrencies(options: TSimpleSwapOrchestratorInitParams<N>): Promise<TSimpleSwapApiCurrency<N>[]> {
    try {
      if (this.#allCurrenciesMap.size) {
        return Array.from(this.#allCurrenciesMap.values())
      }

      const response = await this.#api.get<TSimpleSwapApiGetCurrenciesResponse>('/currencies')

      const tokens: TSimpleSwapApiCurrency<N>[] = []

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
      const response = await this.#api.get<TSimpleSwapApiGetPairsResponse>(`/pairs/${ticker}/${network}`)
      const pairs = response.data.result[`${ticker}:${network}`] ?? []

      const tokens: TSimpleSwapApiCurrency<N>[] = []

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

  async getRange(currencyFrom: TSimpleSwapApiCurrency, currencyTo: TSimpleSwapApiCurrency) {
    try {
      const response = await this.#api.get<TSimpleSwapApiGetRangeResponse>('/ranges', {
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

  async getEstimate(currencyFrom: TSimpleSwapApiCurrency, currencyTo: TSimpleSwapApiCurrency, amount: string) {
    try {
      const response = await this.#api.get<TSimpleSwapApiGetEstimateResponse>('/estimates', {
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
  }: TSimpleSwapApiCreateExchangeParams) {
    try {
      const {
        data: { result },
      } = await this.#api.post<TSimpleSwapApiCreateExchangeResponse>('/exchanges', {
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
      } = await this.#api.get<TSimpleSwapApiGetExchangeResponse>(`/exchanges/${id}`)

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
