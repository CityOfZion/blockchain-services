import { BlockchainDataService, BlockchainService, CalculateTransferFeeDetails, SendTransactionParam, Claimable, Account, Exchange, BDSClaimable, exchangeOptions } from '@cityofzion/blockchain-service'
import { api, rpc, tx, u, wallet } from '@cityofzion/neon-js'
import * as AsteroidSDK from '@moonlight-io/asteroid-sdk-js'
import { gasInfoNeo3, neoInfoNeo3 } from './constants'
import { claimGasExceptions } from './excpetions'
import { explorerOptions } from './explorer'
export class BSNeo3 implements BlockchainService, Claimable {
    dataService: BlockchainDataService & BDSClaimable = explorerOptions.dora
    blockchain: string = "neo3"
    derivationPath: string = "m/44'/888'/0'/0/?"
    feeToken: { hash: string; symbol: string; decimals: number; } = gasInfoNeo3
    exchange: Exchange = exchangeOptions.flamingo
    private keychain = new AsteroidSDK.Keychain()
    async sendTransaction(param: SendTransactionParam): Promise<string> {
        const { senderAccount } = param
        const node = await this.dataService.getHigherNode()
        const facade = await api.NetworkFacade.fromConfig({ node: node.url })
        const intents = this.buildTransfer(param)
        const signing = this.signTransfer(senderAccount)
        const result = await facade.transferToken(intents, signing)
        return result
    }
    private buildTransfer({ amount, receiverAddress, senderAccount, tokenHash }: SendTransactionParam) {
        const intents: api.Nep17TransferIntent[] = []
        const account = new wallet.Account(senderAccount.getWif())
        intents.push({
            to: receiverAddress,
            contractHash: tokenHash,
            from: account,
            decimalAmt: amount
        })
        return intents
    }
    private signTransfer(account: Account) {
        const neoAccount = new wallet.Account(account.getWif())
        const result: api.signingConfig = {
            signingCallback: api.signWithAccount(neoAccount)
        }
        return result
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
        return { address, wif }
    }
    generateAccountFromWif(wif: string): string {
        const { address } = new wallet.Account(wif)
        return address
    }
    async decryptKey(encryptedKey: string, password: string): Promise<{ wif: string; address: string; }> {
        const wif = await wallet.decrypt(encryptedKey, password)
        const { address } = new wallet.Account(wif)
        return { address, wif }
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
    async calculateTransferFee(param: SendTransactionParam): Promise<{ result: number; details?: CalculateTransferFeeDetails | undefined; }> {
        const node = await this.dataService.getHigherNode()
        const url = node.url
        const rpcClient = new rpc.NeoServerRpcClient(url)
        const intents = this.buildTransfer(param)
        const txBuilder = new api.TransactionBuilder()
        for (const intent of intents) {
            if (intent.decimalAmt) {
                const [tokenInfo] = await api.getTokenInfos(
                    [intent.contractHash],
                    rpcClient
                )
                const amt = u.BigInteger.fromDecimal(
                    intent.decimalAmt,
                    tokenInfo.decimals
                )
                txBuilder.addNep17Transfer(
                    intent.from,
                    intent.to,
                    intent.contractHash,
                    amt
                )
            }
        }
        const txn = txBuilder.build()
        const accountScriptHash = wallet.getScriptHashFromAddress(param.senderAccount.getAddress())
        const invokeFunctionResponse = await rpcClient.invokeScript(
            u.HexString.fromHex(txn.script),
            [
                {
                    account: accountScriptHash,
                    scopes: String(tx.WitnessScope.CalledByEntry)
                }
            ]
        )
        const systemFee = u.BigInteger.fromNumber(
            invokeFunctionResponse.gasconsumed
        ).toDecimal(gasInfoNeo3.decimals)

        const networkFeeResponse = await rpcClient.calculateNetworkFee(txn)

        const networkFee = (Number(networkFeeResponse) / 10 ** gasInfoNeo3.decimals)

        const sumFee = Number(systemFee) + networkFee

        const result: { result: number, details?: CalculateTransferFeeDetails } = {
            result: sumFee,
            details: {
                networkFee: networkFee.toString(),
                systemFee
            }
        }
        return result
    }
    //Claimable interface implementation
    async claim(address: string, account: Account): Promise<{ txid: string; symbol: string; hash: string; }> {
        const balance = await this.dataService.getBalance(address)
        const neoHash = neoInfoNeo3.hash
        const neoBalance = balance.find(balance => balance.hash === neoHash)
        const gasBalance = balance.find(balance => balance.hash === gasInfoNeo3.hash)
        const neoAccount = new wallet.Account(account.getWif())

        if (!neoBalance || !gasBalance) throw new Error(`Problem to claim`);

        const dataToClaim: SendTransactionParam = {
            amount: neoBalance.amount,
            receiverAddress: address,
            senderAccount: account,
            tokenHash: neoBalance.hash
        }

        const feeToClaim = await this.calculateTransferFee(dataToClaim)

        if (gasBalance.amount < feeToClaim.result) {
            claimGasExceptions.InsuficientGas(String(gasBalance.amount), String(feeToClaim.result))
        }
        const url = (await this.dataService.getHigherNode()).url
        const facade = await api.NetworkFacade.fromConfig({ node: url })
        const signing = this.signTransfer(account)
        const txid = await facade.claimGas(neoAccount, signing)
        const result: { txid: string; symbol: string; hash: string; } = {
            hash: gasInfoNeo3.hash,
            symbol: gasInfoNeo3.symbol,
            txid
        }
        return result;
    }
}