import { Currency } from "../../interfaces"

export const FLAMINGO_TOKENINFO_PRICES = 'token-info/prices'
export const FLAMINGO_FIAT_EXCHANGE_RATE = (currencyFrom: Currency, currencyTo: Currency) => {
    return `fiat/exchange-rate?pair=${currencyFrom}_${currencyTo}`
}