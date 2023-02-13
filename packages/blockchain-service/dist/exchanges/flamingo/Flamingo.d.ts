import { Currency, Exchange } from '../../interfaces';
export declare class Flamingo implements Exchange {
    private request;
    getTokenPrices(currency: Currency): Promise<{
        amount: number;
        Symbol: string;
    }[]>;
}
