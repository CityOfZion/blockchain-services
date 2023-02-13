"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flamingo = void 0;
const axios_1 = require("axios");
const FlamingoRoutes_1 = require("./FlamingoRoutes");
class Flamingo {
    constructor() {
        this.request = axios_1.default.create({ baseURL: 'https://api.flamingo.finance' });
    }
    getTokenPrices(currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: prices } = yield this.request.get(`/${FlamingoRoutes_1.FLAMINGO_TOKENINFO_PRICES}`);
            let currencyRatio = 1;
            if (currency !== 'USD') {
                const { data } = yield this.request.get(`/${(0, FlamingoRoutes_1.FLAMINGO_FIAT_EXCHANGE_RATE)('USD', currency)}`);
                currencyRatio = data;
            }
            return prices.map(price => ({
                amount: price.usd_price * currencyRatio,
                Symbol: price.symbol
            }));
        });
    }
}
exports.Flamingo = Flamingo;
