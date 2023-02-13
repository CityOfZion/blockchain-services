export const claimGasExceptions = {
    InsuficientGas: (gasAmount: string, gasFee: string) => {
        throw new Error(`Insuficient GAS to complete transaction, the fee it's ${gasFee} and you have ${gasAmount}`)
    }
}