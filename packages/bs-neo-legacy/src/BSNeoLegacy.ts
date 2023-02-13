import { Account, BDSClaimable, BlockchainDataService, BlockchainService, CalculateTransferFeeDetails, Claimable, Exchange, SendTransactionParam } from '@cityofzion/blockchain-service'
import * as AsteroidSDK from '@moonlight-io/asteroid-sdk-js'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { explorerNeoLegacyOption } from './explorer'
import { nativeAssetsNeoLegacy, unclaimedTokenNeoLegacy } from './constants'
export class BSNeoLegacy implements BlockchainService, Claimable {
    dataService: BlockchainDataService & BDSClaimable = explorerNeoLegacyOption.dora
    blockchain: string = 'neolegacy'
    derivationPath: string = "m/44'/888'/0'/0/?"
    feeToken: { hash: string; symbol: string; decimals: number; };
    exchange: Exchange;
    private keychain = new AsteroidSDK.Keychain()
    private nativeAssets: { symbol: string; hash: string; decimals: number }[] = nativeAssetsNeoLegacy

    async sendTransaction(param: SendTransactionParam): Promise<string> {
        const url = (await this.dataService.getHigherNode()).url
        const apiProvider = new api.neoscan.instance("MainNet")
        const account = new wallet.Account(param.senderAccount.getWif())
        const isNativeTransaction = this.nativeAssets.some(asset => asset.hash === param.tokenHash)
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
                    intents: this.buildNativeTransaction(param),
                    fees: priorityFee
                })
            },
            nep5: () => {
                return api.doInvoke({
                    account,
                    api: apiProvider,
                    script: this.buildNep5Transaction(param).str,
                    url,
                    fees: priorityFee
                })
            }
        }
        const result = isNativeTransaction ? await transactionOperations.native() : await transactionOperations.nep5()
        if (!result.tx) throw new Error("Failed to send transaction");
        return result.tx.hash
    }
    private buildNativeTransaction(param: SendTransactionParam) {
        const nativeAsset = this.nativeAssets.find(asset => asset.hash === param.tokenHash)
        if (!nativeAsset) throw new Error(`Failed to build transaction like native transaction => ${JSON.stringify(param)}`);
        return api.makeIntent({ [nativeAsset.symbol]: param.amount }, param.receiverAddress)
    }
    private buildNep5Transaction(param: SendTransactionParam) {
        const isNativeAsset = this.nativeAssets.some(asset => asset.hash === param.tokenHash)
        if (isNativeAsset) throw new Error(`Failed to build transaction like nep5 transaction => ${JSON.stringify(param)}`);
        const sb = new sc.ScriptBuilder()
        const senderHash = u.reverseHex(wallet.getScriptHashFromAddress(param.senderAccount.getAddress()))
        const receiveHash = u.reverseHex(wallet.getScriptHashFromAddress(param.receiverAddress))
        const adjustedAmount = new u.Fixed8(param.amount).toRawNumber()
        return sb.emitAppCall(param.tokenHash.replace('0x', ''), "transfer", [
            senderHash,
            receiveHash,
            sc.ContractParam.integer(adjustedAmount.toString())
        ])
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
        throw new Error(`Doesn't have fee to make a transaction on ${this.blockchain}`);
    }
    //Implementation Claim interface
    async claim(address: string, account: Account): Promise<{ txid: string; symbol: string; hash: string }> {
        const neoAccount = new wallet.Account(account.getWif())
        const balances = await this.dataService.getBalance(address)
        const neoBalance = balances.find(balance => balance.symbol === 'NEO')
        const apiProvider = new api.neoscan.instance("MainNet")
        const neoNativeAsset = this.nativeAssets.find(nativeAsset => nativeAsset.symbol === neoBalance?.symbol)
        if (!neoNativeAsset || !neoBalance) throw new Error("Neo it's necessary to do a claim");
        const hasClaim = await this.dataService.getUnclaimed(address)
        if (hasClaim.unclaimed <= 0) throw new Error(`Doesn't have gas to claim`);
        const url = (await this.dataService.getHigherNode()).url
        const claims = await api.neoCli.getClaims(url, address)
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