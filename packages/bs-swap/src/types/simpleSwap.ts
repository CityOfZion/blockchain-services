import { BlockchainService, SwapServiceToken } from '@cityofzion/blockchain-service'

export type SimpleSwapServiceInitParams<BSName extends string = string> = {
  blockchainServicesByName: Record<BSName, BlockchainService<BSName>>
  chainsByServiceName: Partial<Record<BSName, string[]>>
}

export type SimpleSwapApiCurrency<BSName extends string = string> = SwapServiceToken<BSName> & {
  network: string
  ticker: string
  validationAddress: string
}

export type SimpleSwapApiCurrencyResponse = {
  name: string | null
  ticker: string | null
  network: string | null
  validationAddress: string | null
  image: string | null
  contractAddress: string | null
  addressExplorer: string | null
  txExplorer: string | null
}

export type SimpleSwapApiGetCurrenciesResponse = {
  result: SimpleSwapApiCurrencyResponse[]
}

export type SimpleSwapApiGetPairsResponse = {
  result: Record<string, string[]>
}

export type SimpleSwapApiGetRangeResponse = {
  result: {
    min: string
    max: string | null
  }
}

export type SimpleSwapApiGetEstimateResponse = {
  result: {
    estimatedAmount: string
  }
}

export type SimpleSwapApiCreateExchangeResponse = {
  result: {
    id: string
    addressFrom: string
    log?: string
  }
}

export type SimpleSwapApiGetExchangeResponse = {
  result: {
    status: string
    txFrom?: string
    txTo?: string
    log?: string
  }
}
