import { Currency, Exchange, TokenPricesResponse } from "@cityofzion/blockchain-service";
import axios from "axios";
import tokens from '../asset/tokens.json'
import CryptoCompareExchangeResponse from "./CryptoCompareExchangeResponse";
export class CryptoCompare implements Exchange {
    async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
        const tokenSymbols = tokens.map(token => token.symbol)
        const { data: prices } = await axios.get<CryptoCompareExchangeResponse>('https://min-api.cryptocompare.com/data/pricemultifull',
            {
                params: {
                    fsyms: tokenSymbols.join(),
                    tsyms: currency
                }
            })
        const result: TokenPricesResponse[] = Object.entries(prices.RAW).map(([symbol, price]) => ({
            symbol,
            amount: price[currency].PRICE
        }))
        return result
    }

}