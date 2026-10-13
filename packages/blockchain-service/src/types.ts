export type TGhostMarketAssetResponse = {
  tokenId: string
  contract: {
    chain?: string
    hash: string
    symbol: string
  }
  creator: {
    address: string
    offchainName?: string
  }
  apiUrl?: string
  ownerships: {
    owner: {
      address?: string
    }
  }[]
  collection: {
    name?: string
    logoUrl?: string
  }
  metadata: {
    description: string
    mediaType: string
    mediaUri: string
    mintDate: number
    mintNumber: number
    name: string
  }
}

export type TGhostMarketAssetsResponse = {
  assets: TGhostMarketAssetResponse[]
  next: string
}

export type TFlamingoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export type TForthewinPricesResponse = {
  [key: string]: number
}

export type TCryptoCompareDataResponse = {
  RAW: {
    [symbol: string]: {
      [currency: string]: {
        PRICE: number
      }
    }
  }
}

export type TCryptoCompareHistoryResponse = {
  Data: {
    time: number
    close: number
  }[]
}

export type TDefiLlamaPricesResponse = {
  coins: {
    [id: string]: {
      price: number
      symbol?: string
      timestamp?: number
      confidence?: number
      decimals?: number
    }
  }
}

export type TDefiLlamaChartResponse = {
  coins: {
    [id: string]: {
      symbol?: string
      confidence?: number
      decimals?: number
      prices: {
        timestamp: number
        price: number
      }[]
    }
  }
}

export type THexString = `0x${string}`

export type TBSUtilsHelperRetryOptions = {
  retries?: number
  delay?: number
  shouldRetry?: (error: any) => boolean
}

export type TBSStringHelperRemoveSpecialCharacterOptions = {
  allowSpaces?: boolean
  allowDots?: boolean
  trimText?: boolean
}

export type TMnemonic = string | string[]
