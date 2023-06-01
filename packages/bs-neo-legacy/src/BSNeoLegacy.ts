import { Account, keychain, BDSClaimable, BlockchainDataService, BlockchainService, CalculateTransferFeeResponse, ClaimResponse, Claimable, Exchange, IntentTransactionParam, SendTransactionParam, Token, TokenInfo } from '@cityofzion/blockchain-service'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { explorerNeoLegacyOption } from './explorer'
import { nativeAssetsNeoLegacy, unclaimedTokenNeoLegacy } from './constants'
const [, neoToken] = nativeAssetsNeoLegacy
import tokens from './asset/tokens.json'

export class BSNeoLegacy<BSCustomName extends string = string> implements BlockchainService, Claimable  {
    dataService: BlockchainDataService & BDSClaimable = explorerNeoLegacyOption.dora
    blockchainName: BSCustomName;
    feeToken: TokenInfo;
    exchange: Exchange;
    tokenClaim: TokenInfo = neoToken
    tokens: Token[] = tokens

    private nativeAssets: TokenInfo[] = nativeAssetsNeoLegacy
    private derivationPath: string = "m/44'/888'/0'/0/?"

    constructor(blockchainName: BSCustomName) {
        this.blockchainName = blockchainName
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
    generateMnemonic(): string[] {
        keychain.generateMnemonic(128)
        if (!keychain.mnemonic) throw new Error("Failed to generate mnemonic")
        return keychain.mnemonic.toString().split(' ')
    }
    generateAccount(mnemonic: string[], index: number): Account {
        keychain.importMnemonic(mnemonic.join(' '))
        const childKey = keychain.generateChildKey("neo", this.derivationPath.replace('?', index.toString()))
        const wif =  childKey.getWIF()
        const { address } = new wallet.Account(wif)
        return { address, wif }
    }
    generateAccountFromWif(wif: string): Account {
        const { address } = new wallet.Account(wif)
        return { address, wif }
    }
    async decryptKey(encryptedKey: string, password: string): Promise<Account> {
        const wif = await wallet.decrypt(encryptedKey, password)
        const { address } = new wallet.Account(wif)
        const result: { wif: string; address: string; } = { address, wif }
        return result
    }
    calculateTransferFee(): Promise<CalculateTransferFeeResponse> {
        throw new Error(`Doesn't have fee to make a transaction on ${this.blockchainName}`);
    }
    async sendTransaction(param: SendTransactionParam): Promise<string> {
        const url = (await this.dataService.getHigherNode()).url
        const apiProvider = new api.neoscan.instance("MainNet")
        const account = new wallet.Account(param.senderAccount.wif)
        const intentsWithTye = this.setTypeIntents(param.transactionIntents)
        const isNativeTransaction = intentsWithTye.every(intent => intent.type === 'native')
        const priorityFee = param.priorityFee ?? 0
        const [gasAsset] = this.nativeAssets
        const gasBalance = (await this.dataService.getBalance(param.senderAccount.address)).find(balance => balance.hash === gasAsset.hash)
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
    //Implementation Claim interface
    async claim(account: Account): Promise<ClaimResponse> {
        const neoAccount = new wallet.Account(account.wif)
        const balances = await this.dataService.getBalance(account.address)
        const neoBalance = balances.find(balance => balance.symbol === 'NEO')
        const apiProvider = new api.neoscan.instance("MainNet")
        const neoNativeAsset = this.nativeAssets.find(nativeAsset => nativeAsset.symbol === neoBalance?.symbol)
        if (!neoNativeAsset || !neoBalance) throw new Error("Neo it's necessary to do a claim");
        const hasClaim = await this.dataService.getUnclaimed(account.address)
        if (hasClaim.unclaimed <= 0) throw new Error(`Doesn't have gas to claim`);
        const url = (await this.dataService.getHigherNode()).url
        const claims = await api.neoCli.getClaims(url, account.address)
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
                const senderHash = u.reverseHex(wallet.getScriptHashFromAddress(senderAccount.address))
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
}