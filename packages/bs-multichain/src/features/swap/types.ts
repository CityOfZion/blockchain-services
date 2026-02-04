import type { IBlockchainService, TSwapToken } from '@cityofzion/blockchain-service'

export type TSimpleSwapOrchestratorInitParams<N extends string = string> = {
  blockchainServicesByName: Record<N, IBlockchainService<N>>
  chainsByServiceName: Partial<Record<N, string[]>>
}

export type TSimpleSwapApiCurrency<N extends string = string> = TSwapToken<N> & {
  network: string
  ticker: string
  hasExtraId: boolean
  validationExtra: string | null
  validationAddress: string
}

export type TSimpleSwapApiCreateExchangeParams = {
  currencyFrom: TSimpleSwapApiCurrency
  currencyTo: TSimpleSwapApiCurrency
  amount: string
  refundAddress: string
  address: string
  extraIdToReceive: string | null
}

export type TSimpleSwapApiCurrencyResponse = {
  name: string | null
  ticker: string | null
  network: string | null
  hasExtraId: boolean
  validationExtra: string | null
  validationAddress: string | null
  image: string | null
  contractAddress: string | null
  addressExplorer: string | null
  txExplorer: string | null
  precision: number | null
}

export type TSimpleSwapApiGetCurrenciesResponse = {
  result: TSimpleSwapApiCurrencyResponse[]
}

export type TSimpleSwapApiGetPairsResponse = {
  result: Record<string, string[]>
}

export type TSimpleSwapApiGetRangeResponse = {
  result: {
    min: string
    max: string | null
  }
}

export type TSimpleSwapApiGetEstimateResponse = {
  result: {
    estimatedAmount: string
  }
}

export type TSimpleSwapApiCreateExchangeResponse = {
  result: {
    id: string
    addressFrom: string
    log?: string
  }
}

export type TSimpleSwapApiGetExchangeResponse = {
  result: {
    status: string
    txFrom?: string
    txTo?: string
    log?: string
  }
}
