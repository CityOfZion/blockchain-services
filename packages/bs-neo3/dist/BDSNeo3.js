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
exports.BDSNeo3 = void 0;
const neon_js_1 = require("@cityofzion/neon-js");
const axios_1 = require("axios");
const DoraNeo3Routes_1 = require("./explorer/dora/DoraNeo3Routes");
class BDSNeo3 {
    constructor() {
        this.explorer = 'https://dora.coz.io';
        this.network = 'mainnet';
        this.request = axios_1.default.create({ baseURL: `https://dora.coz.io/api/v1/neo3/${this.network}` });
    }
    setNetwork(network) {
        this.network = network;
    }
    getTransaction(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_TRANSACTION}/${txid}`);
            const transaction = yield this.findTransactionByTxid(txid, data.sender);
            if (!data || !transaction)
                throw new Error("query getTransaction failed");
            const result = {
                block: data.block,
                time: data.time,
                txid: data.hash,
                netfee: data.netfee,
                sysfee: data.sysfee,
                totfee: (Number(data.netfee) + Number(data.sysfee)).toString(),
                notifications: transaction.notifications,
                transfers: transaction.transfers
            };
            return result;
        });
    }
    findTransactionByTxid(txid, address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let transaction = undefined;
                let page = 1;
                let stop = false;
                while (!stop) {
                    const transactionHistory = yield this.getHistoryTransactions(address, page);
                    transaction = transactionHistory.transactions.find(tx => tx.txid === txid);
                    if (transaction) {
                        stop = true;
                    }
                    else {
                        page++;
                    }
                }
                if (!transaction)
                    throw new Error(`Problem to build the transfers of transaction => ${txid}`);
                return transaction;
            }
            catch (error) {
                throw new Error(`Problem to build the transfers of transaction => ${txid}`);
            }
        });
    }
    getHistoryTransactions(address, page = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_TRANSACTIONS}/${address}/${page}`);
            if (!data)
                throw new Error("query getHistoryTransactions failed");
            const result = {
                totalCount: data.totalCount,
                transactions: data.items.map(item => {
                    return {
                        block: item.block,
                        time: item.time,
                        txid: item.hash,
                        netfee: item.netfee,
                        sysfee: item.sysfee,
                        totfee: (Number(item.sysfee) + Number(item.netfee)).toString(),
                        transfers: item.transfers.map(transfer => {
                            return {
                                amount: transfer.amount,
                                from: transfer.from,
                                to: transfer.to,
                                hash: transfer.scripthash
                            };
                        }),
                        notifications: item.notifications
                    };
                })
            };
            return result;
        });
    }
    getContract(contractHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_CONTRACT}/${contractHash}`);
            if (!data)
                throw new Error("query getContract failed");
            const result = {
                hash: data.hash,
                methods: data.manifest.abi.methods,
                name: data.manifest.name
            };
            return result;
        });
    }
    getTokenInfo(tokenHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_CONTRACT}/${tokenHash}`);
            if (!data)
                throw new Error("query getTokenInfo failed");
            const result = {
                decimals: Number(data.decimals),
                symbol: data.symbol
            };
            return result;
        });
    }
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_BALANCE}/${address}`);
            if (!data)
                throw new Error("query getBalance failed");
            const result = data.map(balance => {
                return {
                    amount: Number(balance.balance),
                    hash: balance.asset,
                    name: balance.asset_name,
                    symbol: balance.symbol,
                };
            });
            return result;
        });
    }
    getAllNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraNeo3Routes_1.DORA_NODES}`);
            const result = data;
            return result;
        });
    }
    getHigherNode() {
        return __awaiter(this, void 0, void 0, function* () {
            const nodes = yield this.getAllNodes();
            const node = nodes.reduce((bestNode, node) => {
                if (bestNode.height >= node.height) {
                    return bestNode;
                }
                return node;
            });
            return node;
        });
    }
    //Implementation of BDSClaimable
    getUnclaimed(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = (yield this.getHigherNode()).url;
            const rpcClient = new neon_js_1.rpc.RPCClient(url);
            const response = yield rpcClient.getUnclaimedGas(address);
            const result = {
                address,
                unclaimed: Number(response),
            };
            return result;
        });
    }
}
exports.BDSNeo3 = BDSNeo3;
