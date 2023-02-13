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
exports.BSNeoLegacy = void 0;
const AsteroidSDK = require("@moonlight-io/asteroid-sdk-js");
const neon_js_1 = require("@cityofzion/neon-js");
const explorer_1 = require("./explorer");
const constants_1 = require("./constants");
class BSNeoLegacy {
    constructor() {
        this.dataService = explorer_1.explorerNeoLegacyOption.dora;
        this.blockchain = 'neolegacy';
        this.derivationPath = "m/44'/888'/0'/0/?";
        this.keychain = new AsteroidSDK.Keychain();
        this.nativeAssets = constants_1.nativeAssetsNeoLegacy;
    }
    sendTransaction(param) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const url = (yield this.dataService.getHigherNode()).url;
            const apiProvider = new neon_js_1.api.neoscan.instance("MainNet");
            const account = new neon_js_1.wallet.Account(param.senderAccount.getWif());
            const isNativeTransaction = this.nativeAssets.some(asset => asset.hash === param.tokenHash);
            const priorityFee = (_a = param.priorityFee) !== null && _a !== void 0 ? _a : 0;
            const [gasAsset] = this.nativeAssets;
            const gasBalance = (yield this.dataService.getBalance(param.senderAccount.getAddress())).find(balance => balance.hash === gasAsset.hash);
            if ((gasBalance === null || gasBalance === void 0 ? void 0 : gasBalance.amount) < priorityFee)
                throw new Error("Don't have funds to pay the transaction");
            const transactionOperations = {
                native: () => {
                    return neon_js_1.api.sendAsset({
                        account,
                        api: apiProvider,
                        url,
                        intents: this.buildNativeTransaction(param),
                        fees: priorityFee
                    });
                },
                nep5: () => {
                    return neon_js_1.api.doInvoke({
                        account,
                        api: apiProvider,
                        script: this.buildNep5Transaction(param).str,
                        url,
                        fees: priorityFee
                    });
                }
            };
            const result = isNativeTransaction ? yield transactionOperations.native() : yield transactionOperations.nep5();
            if (!result.tx)
                throw new Error("Failed to send transaction");
            return result.tx.hash;
        });
    }
    buildNativeTransaction(param) {
        const nativeAsset = this.nativeAssets.find(asset => asset.hash === param.tokenHash);
        if (!nativeAsset)
            throw new Error(`Failed to build transaction like native transaction => ${JSON.stringify(param)}`);
        return neon_js_1.api.makeIntent({ [nativeAsset.symbol]: param.amount }, param.receiverAddress);
    }
    buildNep5Transaction(param) {
        const isNativeAsset = this.nativeAssets.some(asset => asset.hash === param.tokenHash);
        if (isNativeAsset)
            throw new Error(`Failed to build transaction like nep5 transaction => ${JSON.stringify(param)}`);
        const sb = new neon_js_1.sc.ScriptBuilder();
        const senderHash = neon_js_1.u.reverseHex(neon_js_1.wallet.getScriptHashFromAddress(param.senderAccount.getAddress()));
        const receiveHash = neon_js_1.u.reverseHex(neon_js_1.wallet.getScriptHashFromAddress(param.receiverAddress));
        const adjustedAmount = new neon_js_1.u.Fixed8(param.amount).toRawNumber();
        return sb.emitAppCall(param.tokenHash.replace('0x', ''), "transfer", [
            senderHash,
            receiveHash,
            neon_js_1.sc.ContractParam.integer(adjustedAmount.toString())
        ]);
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
        const result = { address, wif };
        return result;
    }
    generateAccountFromWif(wif) {
        return new neon_js_1.wallet.Account(wif).address;
    }
    decryptKey(encryptedKey, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const wif = yield neon_js_1.wallet.decrypt(encryptedKey, password);
            const { address } = new neon_js_1.wallet.Account(wif);
            const result = { address, wif };
            return result;
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
    calculateTransferFee(param, details) {
        throw new Error(`Doesn't have fee to make a transaction on ${this.blockchain}`);
    }
    //Implementation Claim interface
    claim(address, account) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoAccount = new neon_js_1.wallet.Account(account.getWif());
            const balances = yield this.dataService.getBalance(address);
            const neoBalance = balances.find(balance => balance.symbol === 'NEO');
            const apiProvider = new neon_js_1.api.neoscan.instance("MainNet");
            const neoNativeAsset = this.nativeAssets.find(nativeAsset => nativeAsset.symbol === (neoBalance === null || neoBalance === void 0 ? void 0 : neoBalance.symbol));
            if (!neoNativeAsset || !neoBalance)
                throw new Error("Neo it's necessary to do a claim");
            const hasClaim = yield this.dataService.getUnclaimed(address);
            if (hasClaim.unclaimed <= 0)
                throw new Error(`Doesn't have gas to claim`);
            const url = (yield this.dataService.getHigherNode()).url;
            const claims = yield neon_js_1.api.neoCli.getClaims(url, address);
            const claimGasResponse = yield neon_js_1.api.claimGas({
                claims,
                api: apiProvider,
                account: neoAccount,
                url
            });
            const result = {
                txid: claimGasResponse.response.txid,
                hash: constants_1.unclaimedTokenNeoLegacy.hash,
                symbol: constants_1.unclaimedTokenNeoLegacy.symbol
            };
            return result;
        });
    }
}
exports.BSNeoLegacy = BSNeoLegacy;
