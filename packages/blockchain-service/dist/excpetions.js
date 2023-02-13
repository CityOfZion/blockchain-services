"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exception = void 0;
exports.exception = {
    invalidBlockchainService: (message) => {
        throw new Error(`Invalid blockchainServices => ${message}`);
    },
    blockchainAlreadyExist: (blockchainName) => {
        throw new Error(`The blockchain ${blockchainName} already exist`);
    }
};
