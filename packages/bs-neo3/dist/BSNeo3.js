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
exports.BSNeo3 = void 0;
const blockchain_service_1 = require("@cityofzion/blockchain-service");
const neon_js_1 = require("@cityofzion/neon-js");
const AsteroidSDK = require("@moonlight-io/asteroid-sdk-js");
const constants_1 = require("./constants");
const excpetions_1 = require("./excpetions");
const explorer_1 = require("./explorer");
class BSNeo3 {
    constructor() {
        this.dataService = explorer_1.explorerOptions.dora;
        this.blockchain = "neo3";
        this.derivationPath = "m/44'/888'/0'/0/?";
        this.feeToken = constants_1.gasInfoNeo3;
        this.exchange = blockchain_service_1.exchangeOptions.flamingo;
        this.keychain = new AsteroidSDK.Keychain();
    }
    sendTransaction(param) {
        return __awaiter(this, void 0, void 0, function* () {
            const { senderAccount } = param;
            const node = yield this.dataService.getHigherNode();
            const facade = yield neon_js_1.api.NetworkFacade.fromConfig({ node: node.url });
            const intents = this.buildTransfer(param);
            const signing = this.signTransfer(senderAccount);
            const result = yield facade.transferToken(intents, signing);
            return result;
        });
    }
    buildTransfer({ amount, receiverAddress, senderAccount, tokenHash }) {
        const intents = [];
        const account = new neon_js_1.wallet.Account(senderAccount.getWif());
        intents.push({
            to: receiverAddress,
            contractHash: tokenHash,
            from: account,
            decimalAmt: amount
        });
        return intents;
    }
    signTransfer(account) {
        const neoAccount = new neon_js_1.wallet.Account(account.getWif());
        const result = {
            signingCallback: neon_js_1.api.signWithAccount(neoAccount)
        };
        return result;
    }
    generateMnemonic() {
        var _a;
        this.keychain.generateMnemonic(128);
        const list = (_a = this.keychain.mnemonic) === null || _a === void 0 ? void 0 : _a.toString();
        if (!list)
            throw new Error("Failed to generate mnemonic");
        return list;
    }
    generateWif(mnemonic, index) {
        this.keychain.importMnemonic(mnemonic);
        const childKey = this.keychain.generateChildKey('neo', this.derivationPath.replace('?', index.toString()));
        return childKey.getWIF();
    }
    generateAccount(mnemonic, index) {
        const wif = this.generateWif(mnemonic, index);
        const { address } = new neon_js_1.wallet.Account(wif);
        return { address, wif };
    }
    generateAccountFromWif(wif) {
        const { address } = new neon_js_1.wallet.Account(wif);
        return address;
    }
    decryptKey(encryptedKey, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const wif = yield neon_js_1.wallet.decrypt(encryptedKey, password);
            const { address } = new neon_js_1.wallet.Account(wif);
            return { address, wif };
        });
    }
    validateAddress(address) {
        return neon_js_1.wallet.isAddress(address);
    }
    validateEncryptedKey(encryptedKey) {
        return neon_js_1.wallet.isNEP2(encryptedKey);
    }
    validateWif(wif) {
        return neon_js_1.wallet.isWIF(wif);
    }
    calculateTransferFee(param) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = yield this.dataService.getHigherNode();
            const url = node.url;
            const rpcClient = new neon_js_1.rpc.NeoServerRpcClient(url);
            const intents = this.buildTransfer(param);
            const txBuilder = new neon_js_1.api.TransactionBuilder();
            for (const intent of intents) {
                if (intent.decimalAmt) {
                    const [tokenInfo] = yield neon_js_1.api.getTokenInfos([intent.contractHash], rpcClient);
                    const amt = neon_js_1.u.BigInteger.fromDecimal(intent.decimalAmt, tokenInfo.decimals);
                    txBuilder.addNep17Transfer(intent.from, intent.to, intent.contractHash, amt);
                }
            }
            const txn = txBuilder.build();
            const accountScriptHash = neon_js_1.wallet.getScriptHashFromAddress(param.senderAccount.getAddress());
            const invokeFunctionResponse = yield rpcClient.invokeScript(neon_js_1.u.HexString.fromHex(txn.script), [
                {
                    account: accountScriptHash,
                    scopes: String(neon_js_1.tx.WitnessScope.CalledByEntry)
                }
            ]);
            const systemFee = neon_js_1.u.BigInteger.fromNumber(invokeFunctionResponse.gasconsumed).toDecimal(constants_1.gasInfoNeo3.decimals);
            const networkFeeResponse = yield rpcClient.calculateNetworkFee(txn);
            const networkFee = (Number(networkFeeResponse) / Math.pow(10, constants_1.gasInfoNeo3.decimals));
            const sumFee = Number(systemFee) + networkFee;
            const result = {
                result: sumFee,
                details: {
                    networkFee: networkFee.toString(),
                    systemFee
                }
            };
            return result;
        });
    }
    //Claimable interface implementation
    claim(address, account) {
        return __awaiter(this, void 0, void 0, function* () {
            const balance = yield this.dataService.getBalance(address);
            const neoHash = constants_1.neoInfoNeo3.hash;
            const neoBalance = balance.find(balance => balance.hash === neoHash);
            const gasBalance = balance.find(balance => balance.hash === constants_1.gasInfoNeo3.hash);
            const neoAccount = new neon_js_1.wallet.Account(account.getWif());
            if (!neoBalance || !gasBalance)
                throw new Error(`Problem to claim`);
            const dataToClaim = {
                amount: neoBalance.amount,
                receiverAddress: address,
                senderAccount: account,
                tokenHash: neoBalance.hash
            };
            const feeToClaim = yield this.calculateTransferFee(dataToClaim);
            if (gasBalance.amount < feeToClaim.result) {
                excpetions_1.claimGasExceptions.InsuficientGas(String(gasBalance.amount), String(feeToClaim.result));
            }
            const url = (yield this.dataService.getHigherNode()).url;
            const facade = yield neon_js_1.api.NetworkFacade.fromConfig({ node: url });
            const signing = this.signTransfer(account);
            const txid = yield facade.claimGas(neoAccount, signing);
            const result = {
                hash: constants_1.gasInfoNeo3.hash,
                symbol: constants_1.gasInfoNeo3.symbol,
                txid
            };
            return result;
        });
    }
}
exports.BSNeo3 = BSNeo3;
