interface CryptoCompareExchangeResponse {
    RAW: {
        [symbol: string]: {
            [currency: string]: {
                PRICE: number
            }
        }
    }
}

export default CryptoCompareExchangeResponse