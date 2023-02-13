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
exports.BDSNeoLegacy = void 0;
const neon_js_1 = require("@cityofzion/neon-js");
const axios_1 = require("axios");
const DoraRoutesNeoLegacy_1 = require("./explorer/dora/DoraRoutesNeoLegacy");
class BDSNeoLegacy {
    constructor() {
        this.explorer = 'https://dora.coz.io/';
        this.network = 'mainnet';
        this.request = axios_1.default.create({ baseURL: `https://dora.coz.io/api/v1/neo2/${this.network}` });
    }
    setNetwork(network) {
        this.network = network;
    }
    getTransaction(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraRoutesNeoLegacy_1.DORA_NEO_LEGACY_TRANSACTION}/${txid}`);
            const result = {
                block: data.block,
                netfee: data.net_fee,
                sysfee: data.sys_fee,
                time: data.time,
                txid: data.txid,
                totfee: (Number(data.sys_fee) + Number(data.net_fee)).toString(),
                notifications: [],
                transfers: data.vout.map((transfer) => {
                    var _a;
                    return {
                        amount: transfer.value,
                        from: (_a = data.vout[data.vout.length - 1]) === null || _a === void 0 ? void 0 : _a.address,
                        hash: transfer.asset,
                        to: transfer.address
                    };
                })
            };
            return result;
        });
    }
    getHistoryTransactions(address, page = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`${DoraRoutesNeoLegacy_1.DORA_NEO_LEGACY_HISTORY_TRANSACTIONS}/${address}/${page}`);
            const entriesGroupByTxid = {};
            const transactionsGroupByTxid = [];
            data.entries.forEach((entry) => {
                entriesGroupByTxid[entry.txid] = data.entries.filter(it => it.txid === entry.txid);
                const haveTransaction = transactionsGroupByTxid.find(it => it.txid === entry.txid);
                if (!haveTransaction) {
                    transactionsGroupByTxid.push({
                        block: entry.block_height,
                        netfee: '0',
                        sysfee: '0',
                        totfee: '0',
                        txid: entry.txid,
                        notifications: [],
                        time: entry.time.toString(),
                        transfers: entriesGroupByTxid[entry.txid].map((entryGrouped) => {
                            return {
                                amount: entryGrouped.amount.toString(),
                                from: entryGrouped.address_from,
                                to: entryGrouped.address_to,
                                hash: entryGrouped.asset
                            };
                        })
                    });
                }
                else {
                    haveTransaction.transfers = entriesGroupByTxid[entry.txid].map((entryGrouped) => {
                        return {
                            amount: entryGrouped.amount.toString(),
                            from: entryGrouped.address_from,
                            to: entryGrouped.address_to,
                            hash: entryGrouped.asset
                        };
                    });
                    transactionsGroupByTxid[transactionsGroupByTxid.indexOf(haveTransaction)] = haveTransaction;
                }
            });
            const result = {
                totalCount: data.total_entries,
                transactions: transactionsGroupByTxid
            };
            return result;
        });
    }
    getContract(contractHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = (yield this.getHigherNode()).url;
            const rpcClient = new neon_js_1.rpc.RPCClient(url);
            const response = yield rpcClient.execute(new neon_js_1.rpc.Query({
                method: 'getcontractstate',
                params: [contractHash]
            }));
            const result = {
                hash: response.result.hash,
                name: response.result.name,
                methods: []
            };
            return result;
        });
    }
    getTokenInfo(tokenHash) {
        return __awaiter(this, void 0, void 0, function* () {
            //inconsistency on api
            throw new Error('Depending of script hash the return change and get equal to contract');
        });
    }
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraRoutesNeoLegacy_1.DORA_NEO_LEGACY_BALANCE}/${address}`);
            const result = data.map(balance => {
                return {
                    hash: balance.asset,
                    amount: Number(balance.balance),
                    name: balance.asset_name,
                    symbol: balance.symbol
                };
            });
            return result;
        });
    }
    getAllNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.request.get(`/${DoraRoutesNeoLegacy_1.DORA_NEO_LEGACY_NODES}`);
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
            const { data } = yield this.request.get(`/${DoraRoutesNeoLegacy_1.DORA_NEO_LEGACY_UNCLAIMED}/${address}`);
            const result = {
                address,
                unclaimed: data.unclaimed,
            };
            return result;
        });
    }
}
exports.BDSNeoLegacy = BDSNeoLegacy;
