import { BlockchainDataService, keychain, BlockchainService, CalculateTransferFeeDetails, SendTransactionParam, TokenInfo, Claimable, Account, Exchange, BDSClaimable, exchangeOptions, Token, IntentTransactionParam, NeoNameService, NNSRecordTypes, CalculateTransferFeeResponse } from '@cityofzion/blockchain-service'
import { api, rpc, tx, u, wallet } from '@cityofzion/neon-js'
import { gasInfoNeo3, neoInfoNeo3 } from './constants'
import { claimGasExceptions } from './exceptions'
import { explorerOptions } from './explorer'
import tokens from './assets/tokens.json'
import { NeonInvoker } from '@cityofzion/neon-invoker'
import {NeonParser} from "@cityofzion/neon-parser"
import { ABI_TYPES } from '@cityofzion/neo3-parser'

const NEO_NS_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de";

export class BSNeo3<BSCustomName extends string = string> implements BlockchainService, Claimable, NeoNameService {
    blockchainName: BSCustomName
    dataService: BlockchainDataService & BDSClaimable = explorerOptions.dora
    feeToken: TokenInfo = gasInfoNeo3
    exchange: Exchange = exchangeOptions.flamingo
    tokenClaim: TokenInfo = neoInfoNeo3
    tokens: Token[] = tokens

    private derivationPath: string = "m/44'/888'/0'/0/?"

    constructor(blockchainName: BSCustomName) {
        this.blockchainName = blockchainName
    }
    validateAddress(address: string): boolean {
        return wallet.isAddress(address, 53)
    }
    validateEncryptedKey(encryptedKey: string): boolean {
        return wallet.isNEP2(encryptedKey)
    }
    validateWif(wif: string): boolean {
        return wallet.isWIF(wif)
    }
    validateNNSFormat(domainName: string): boolean {
        if (!domainName.endsWith('.neo')) return false
        return true
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
        return { address, wif }
    }
    async calculateTransferFee(param: SendTransactionParam): Promise<CalculateTransferFeeResponse> {
        const node = await this.dataService.getHigherNode()
        const url = node.url
        const rpcClient = new rpc.NeoServerRpcClient(url)
        const intents = this.buildTransfer(param.transactionIntents, param.senderAccount)
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
        const accountScriptHash = wallet.getScriptHashFromAddress(param.senderAccount.address)
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
    async sendTransaction(param: SendTransactionParam): Promise<string> {
        try {
            const { senderAccount, transactionIntents } = param
            const node = await this.dataService.getHigherNode()
            const facade = await api.NetworkFacade.fromConfig({ node: node.url })
            const intents = this.buildTransfer(transactionIntents, senderAccount)
            const signing = this.signTransfer(senderAccount)
            const result = await facade.transferToken(intents, signing)
            return result;
        } catch (error) {
            throw error;
        }
    }
    //Claimable interface implementation
    async claim(account: Account): Promise<{ txid: string; symbol: string; hash: string; }> {
        const balance = await this.dataService.getBalance(account.address)
        const neoHash = neoInfoNeo3.hash
        const neoBalance = balance.find(balance => balance.hash === neoHash)
        const gasBalance = balance.find(balance => balance.hash === gasInfoNeo3.hash)
        const neoAccount = new wallet.Account(account.wif)

        if (!neoBalance || !gasBalance) throw new Error(`Problem to claim`);

        const dataToClaim: SendTransactionParam = {
            transactionIntents: [{ amount: neoBalance.amount, receiverAddress: account.address, tokenHash: neoBalance.hash }],
            senderAccount: account
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
    // Gets the record of a second-level domain or its subdomains with the specific type.
    async getNNSRecord(
      domainName: string,
      type: NNSRecordTypes
    ): Promise<any> {
        const higherNode = await this.dataService.getHigherNode()
        const parser = NeonParser
        const invoker = await NeonInvoker.init(higherNode.url)
        const response = await invoker.testInvoke({
            invocations: [{
                scriptHash: NEO_NS_HASH,
                operation: "getRecord",
                args: [{ type: "String", value: domainName }, { type: "Integer", value: type }]
            }]
        })

        if (response.stack.length === 0) {
            throw new Error(response.exception ?? 'unrecognized response')
        }

        const parsed = parser.parseRpcResponse(response.stack[0] as any)
        return parsed
    }

    async getOwnerOfNNS(domainName: string): Promise<any> {
        const higherNode = await this.dataService.getHigherNode()
        const parser = NeonParser
        const invoker = await NeonInvoker.init(higherNode.url)
        const response = await invoker.testInvoke({
            invocations: [{
                scriptHash: NEO_NS_HASH,
                operation: "ownerOf",
                args: [{ type: "String", value: domainName }]
            }]
        })

        if (response.stack.length === 0) {
            throw new Error(response.exception ?? 'unrecognized response')
        }

        const parsed = parser.parseRpcResponse(response.stack[0] as any, {type: ABI_TYPES.HASH160.name})
        const address = parser.accountInputToAddress(parsed.replace("0x", ""))
        return address
    }
    private buildTransfer(transactionIntents: IntentTransactionParam[], account: Account) {
        const intents: api.Nep17TransferIntent[] = []
        const neoAccount = new wallet.Account(account.wif)
        for (const transactionIntent of transactionIntents) {
            const { amount, receiverAddress, tokenHash } = transactionIntent
            intents.push({
                to: receiverAddress,
                contractHash: tokenHash,
                from: neoAccount,
                decimalAmt: amount,
            })
        }
        return intents
    }
    private signTransfer(account: Account) {
        const neoAccount = new wallet.Account(account.address)
        const result: api.signingConfig = {
            signingCallback: api.signWithAccount(neoAccount)
        }
        return result
    }
}