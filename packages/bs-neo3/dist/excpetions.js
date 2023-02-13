"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimGasExceptions = void 0;
exports.claimGasExceptions = {
    InsuficientGas: (gasAmount, gasFee) => {
        throw new Error(`Insuficient GAS to complete transaction, the fee it's ${gasFee} and you have ${gasAmount}`);
    }
};
