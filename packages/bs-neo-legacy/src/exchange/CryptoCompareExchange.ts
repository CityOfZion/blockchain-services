import { Currency, Exchange, Network, TokenPricesResponse } from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import {TOKENS} from '../constants'

type CryptoCompareDataResponse = {
    RAW: {
        [symbol: string]: {
            [currency: string]: {
                PRICE: number
            }
        }
    }
}

export class CryptoCompareExchange implements Exchange {
    network: Network;
    private axiosInstance: AxiosInstance

    constructor(network: Network) {
        this.network = network
        this.axiosInstance = axios.create({ baseURL: "https://min-api.cryptocompare.com" })
    }

    async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
        if (this.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')
        const  tokenSymbols = TOKENS[this.network.type].map(token => token.symbol)
        const { data: prices } = await this.axiosInstance.get<CryptoCompareDataResponse>("/data/pricemultifull", {
            params: {
                fsyms: tokenSymbols.join(','),
                tsyms: currency
            }
        })
        return Object.entries(prices.RAW).map(([symbol, price]) => ({
            symbol,
            amount: price[currency].PRICE
        }))
    }

}