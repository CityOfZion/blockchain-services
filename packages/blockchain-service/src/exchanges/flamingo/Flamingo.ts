import axios from 'axios'
import { Currency, Exchange } from '../../interfaces'
import { FlamingoTokenInfoPricesResponse } from './FlamingoResponses'
import { FLAMINGO_FIAT_EXCHANGE_RATE, FLAMINGO_TOKENINFO_PRICES } from './FlamingoRoutes'
export class Flamingo implements Exchange {
    private request = axios.create({ baseURL: 'https://api.flamingo.finance' })
    async getTokenPrices(currency: Currency) {
        const { data: prices } = await this.request.get<FlamingoTokenInfoPricesResponse>(`/${FLAMINGO_TOKENINFO_PRICES}`)
        let currencyRatio: number = 1
        if (currency !== 'USD') {
            const { data } = await this.request.get<number>(`/${FLAMINGO_FIAT_EXCHANGE_RATE('USD', currency)}`)
            currencyRatio = data
        }
        return prices.map(price => ({
            amount: price.usd_price * currencyRatio,
            Symbol: price.symbol
        }))
    }
}