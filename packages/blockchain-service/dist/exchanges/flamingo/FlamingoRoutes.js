"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLAMINGO_FIAT_EXCHANGE_RATE = exports.FLAMINGO_TOKENINFO_PRICES = void 0;
exports.FLAMINGO_TOKENINFO_PRICES = 'token-info/prices';
const FLAMINGO_FIAT_EXCHANGE_RATE = (currencyFrom, currencyTo) => {
    return `fiat/exchange-rate?pair=${currencyFrom}_${currencyTo}`;
};
exports.FLAMINGO_FIAT_EXCHANGE_RATE = FLAMINGO_FIAT_EXCHANGE_RATE;
