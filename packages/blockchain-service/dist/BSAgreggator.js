"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BSAgreggator = void 0;
const excpetions_1 = require("./excpetions");
class BSAgreggator {
    constructor(blockchainservices) {
        this.blockchainservices = blockchainservices;
        this.bsList = Object.values(blockchainservices);
    }
    haveBlockchainServices() {
        const blockchainservices = Object.values(this.blockchainservices);
        const rules = [
            Object.keys(blockchainservices).length > 1,
            Object.values(blockchainservices).length > 1,
        ];
        return rules.every(rule => rule === true);
    }
    addBlockchain(name, blockchain) {
        if (this.blockchainservices[name])
            excpetions_1.exception.blockchainAlreadyExist(name);
        this.blockchainservices[name] = blockchain;
        this.bsList = Object.values(this.blockchainservices);
    }
    validateAddressesAllBlockchains(address) {
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return this.bsList.some(bs => bs.validateAddress(address));
    }
    validateTextAllBlockchains(text) {
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return this.bsList.some(bs => [bs.validateAddress(text), bs.validateEncryptedKey(text), bs.validateWif(text)].some(it => it === true));
    }
    validateWifAllBlockchains(wif) {
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return this.bsList.some(bs => bs.validateWif(wif));
    }
    validateEncryptedKeyAllBlockchains(encryptedKey) {
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return this.bsList.some(bs => bs.validateEncryptedKey(encryptedKey));
    }
    getBlockchainByAddress(address) {
        var _a;
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return (_a = this.bsList.find(bs => bs.validateAddress(address))) !== null && _a !== void 0 ? _a : null;
    }
    getBlockchainByWif(wif) {
        var _a;
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return (_a = this.bsList.find(bs => bs.validateWif(wif))) !== null && _a !== void 0 ? _a : null;
    }
    getBlockchainByEncryptedKey(encryptedKey) {
        var _a;
        if (this.haveBlockchainServices())
            excpetions_1.exception.invalidBlockchainService(JSON.stringify(this.blockchainservices));
        return (_a = this.bsList.find(bs => bs.validateEncryptedKey(encryptedKey))) !== null && _a !== void 0 ? _a : null;
    }
    getBlockchainsClaimable() {
        const methodName = { claim: 'claim', getUnclaimed: 'getUnclaimed' };
        const claimableBlockchains = this.bsList.filter(blockchain => methodName.claim in blockchain && methodName.getUnclaimed in blockchain.dataService);
        return claimableBlockchains;
    }
}
exports.BSAgreggator = BSAgreggator;
