import { Account, BDSClaimable, BlockchainDataService, BlockchainService, CalculateTransferFeeDetails, Claimable, Exchange, IntentTransactionParam, SendTransactionParam, Token } from '@cityofzion/blockchain-service'
import * as AsteroidSDK from '@moonlight-io/asteroid-sdk-js'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { explorerNeoLegacyOption } from './explorer'
import { nativeAssetsNeoLegacy, unclaimedTokenNeoLegacy } from './constants'
const [gasToken, neoToken] = nativeAssetsNeoLegacy
import tokens from './asset/tokens.json'
import { CryptoCompare } from './exchange/CryptoCompare'
export class BSNeoLegacy<BSCustomName extends string = string> implements BlockchainService, Claimable {
    dataService: BlockchainDataService & BDSClaimable = explorerNeoLegacyOption.dora
    blockchainName: BSCustomName;
    derivationPath: string = "m/44'/888'/0'/0/?"
    feeToken: { hash: string; symbol: string; decimals: number; };
    exchange: Exchange = new CryptoCompare()
    tokenClaim: { hash: string; symbol: string; decimals: number } = neoToken
    tokens: Token[] = tokens
    private keychain = new AsteroidSDK.Keychain()
    private nativeAssets: { symbol: string; hash: string; decimals: number }[] = nativeAssetsNeoLegacy
    constructor(blockchainName: BSCustomName) {
        this.blockchainName = blockchainName
    }
    async sendTransaction(param: SendTransactionParam): Promise<string> {
        const url = (await this.dataService.getHigherNode()).url
        const apiProvider = new api.neoscan.instance("MainNet")
        const account = new wallet.Account(param.senderAccount.getWif())
        const intentsWithTye = this.setTypeIntents(param.transactionIntents)
        const isNativeTransaction = intentsWithTye.every(intent => intent.type === 'native')
        const priorityFee = param.priorityFee ?? 0
        const [gasAsset] = this.nativeAssets
        const gasBalance = (await this.dataService.getBalance(param.senderAccount.getAddress())).find(balance => balance.hash === gasAsset.hash)
        if (gasBalance?.amount < priorityFee) throw new Error("Don't have funds to pay the transaction");
        const transactionOperations = {
            native: () => {
                return api.sendAsset({
                    account,
                    api: apiProvider,
                    url,
                    intents: this.buildNativeTransaction(param.transactionIntents),
                    fees: priorityFee
                })
            },
            nep5: () => {
                const extraIntentsNep5 = intentsWithTye.filter(it => it.type === 'native').map(it => {
                    const { type, ...rest } = it
                    return rest
                })
                return api.doInvoke({
                    intents: extraIntentsNep5.length > 0 ? this.buildNativeTransaction(extraIntentsNep5) : undefined,
                    account,
                    api: apiProvider,
                    script: this.buildNep5Transaction(param.transactionIntents, param.senderAccount).str,
                    url,
                    fees: priorityFee
                })
            }
        }
        const result = isNativeTransaction ? await transactionOperations.native() : await transactionOperations.nep5()
        if (!result.tx) throw new Error("Failed to send transaction");
        return result.tx.hash
    }
    private buildNativeTransaction(transactionIntents: IntentTransactionParam[]) {
        let intents: ReturnType<typeof api.makeIntent> = []
        transactionIntents.forEach(transaction => {
            const nativeAsset = this.nativeAssets.find(asset => asset.hash === transaction.tokenHash)
            if (nativeAsset) {
                intents = [...intents, ...api.makeIntent({ [nativeAsset.symbol]: transaction.amount }, transaction.receiverAddress)]
            }
        })
        return intents
    }
    private buildNep5Transaction(transactionIntents: IntentTransactionParam[], senderAccount: Account) {
        const sb = new sc.ScriptBuilder()
        transactionIntents.forEach(transaction => {
            if (!this.isNativeTransaction(transaction)) {
                const senderHash = u.reverseHex(wallet.getScriptHashFromAddress(senderAccount.getAddress()))
                const receiveHash = u.reverseHex(wallet.getScriptHashFromAddress(transaction.receiverAddress))
                const adjustedAmount = new u.Fixed8(transaction.amount).toRawNumber()
                sb.emitAppCall(transaction.tokenHash.replace('0x', ''), "transfer", [
                    senderHash,
                    receiveHash,
                    sc.ContractParam.integer(adjustedAmount.toString())
                ])
            }
        })
        return sb
    }
    private setTypeIntents(transactionIntents: IntentTransactionParam[]) {
        type TransactionIntentResponse = IntentTransactionParam & { type: 'native' | 'nep5' }

        const intents: TransactionIntentResponse[] = transactionIntents.map<TransactionIntentResponse>(transaction => {
            return { ...transaction, type: this.isNativeTransaction(transaction) ? 'native' : 'nep5' }
        })
        return intents
    }
    private isNativeTransaction(transactionParam: IntentTransactionParam) {
        return this.nativeAssets.some(asset => asset.hash === transactionParam.tokenHash)
    }
    generateMnemonic(): string {
        this.keychain.generateMnemonic(128)
        const list = this.keychain.mnemonic?.toString()
        if (!list) throw new Error("Failed to generate mnemonic");
        return list
    }
    generateWif(mnemonic: string, index: number): string {
        this.keychain.importMnemonic(mnemonic)
        const childKey = this.keychain.generateChildKey('neo', this.derivationPath.replace('?', index.toString()))
        return childKey.getWIF()
    }
    generateAccount(mnemonic: string, index: number): { wif: string; address: string; } {
        const wif = this.generateWif(mnemonic, index)
        const { address } = new wallet.Account(wif)
        const result: { wif: string; address: string; } = { address, wif }
        return result
    }
    generateAccountFromWif(wif: string): string {
        return new wallet.Account(wif).address
    }
    async decryptKey(encryptedKey: string, password: string): Promise<{ wif: string; address: string; }> {
        const wif = await wallet.decrypt(encryptedKey, password)
        const { address } = new wallet.Account(wif)
        const result: { wif: string; address: string; } = { address, wif }
        return result
    }
    validateAddress(address: string): boolean {
        return wallet.isAddress(address)
    }
    validateEncryptedKey(encryptedKey: string): boolean {
        return wallet.isNEP2(encryptedKey)
    }
    validateWif(wif: string): boolean {
        return wallet.isWIF(wif)
    }
    calculateTransferFee(param: SendTransactionParam, details?: boolean): Promise<{ result: number; details?: CalculateTransferFeeDetails; }> {
        throw new Error(`Doesn't have fee to make a transaction on ${this.blockchainName}`);
    }
    //Implementation Claim interface
    async claim(account: Account): Promise<{ txid: string; symbol: string; hash: string }> {
        const neoAccount = new wallet.Account(account.getWif())
        const balances = await this.dataService.getBalance(account.getAddress())
        const neoBalance = balances.find(balance => balance.symbol === 'NEO')
        const apiProvider = new api.neoscan.instance("MainNet")
        const neoNativeAsset = this.nativeAssets.find(nativeAsset => nativeAsset.symbol === neoBalance?.symbol)
        if (!neoNativeAsset || !neoBalance) throw new Error("Neo it's necessary to do a claim");
        const hasClaim = await this.dataService.getUnclaimed(account.getAddress())
        if (hasClaim.unclaimed <= 0) throw new Error(`Doesn't have gas to claim`);
        const url = (await this.dataService.getHigherNode()).url
        const claims = await api.neoCli.getClaims(url, account.getAddress())
        const claimGasResponse = await api.claimGas({
            claims,
            api: apiProvider,
            account: neoAccount,
            url
        })

        const result: { txid: string; symbol: string; hash: string } = {
            txid: claimGasResponse.response.txid,
            hash: unclaimedTokenNeoLegacy.hash,
            symbol: unclaimedTokenNeoLegacy.symbol
        }

        return result
    }
}