export type TGhostMarketNDSNeo3AssetApiResponse = {
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

export type TGhostMarketNDSNeo3GetAssetsApiResponse = {
  assets: TGhostMarketNDSNeo3AssetApiResponse[]
  next: string
}

export type TFlamingoForthewinEDSFlamingoPricesApiResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export type TFlamingoForthewinEDSForthewinPricesApiResponse = {
  [key: string]: number
}

export type TCryptoCompareEDSDataResponse = {
  RAW: {
    [symbol: string]: {
      [currency: string]: {
        PRICE: number
      }
    }
  }
}

export type TCryptoCompareEDSHistoryResponse = {
  Data: {
    time: number
    close: number
  }[]
}

export type THexString = `0x${string}`
