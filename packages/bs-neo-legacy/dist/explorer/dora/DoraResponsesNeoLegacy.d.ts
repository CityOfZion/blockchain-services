export interface DoraNeoLegacyConsensusNode {
    url: string;
    height: number;
}
export interface DoraNeoLegacyAssetResponse {
    name: string;
    symbol: string;
    firstseen: number;
    scripthash: string;
    decimals: number;
    type: string;
    details: DoraNeoLegacyDetails;
    time: string;
}
export interface DoraNeoLegacyDetails {
    txid: string;
    size: number;
    type: string;
    version: number;
    attributes?: (null)[] | null;
    vin?: (null)[] | null;
    vout?: (null)[] | null;
    sys_fee: string;
    net_fee: string;
    scripts?: (null)[] | null;
    asset: DoraNeoLegacyAsset;
}
export interface DoraNeoLegacyAsset {
    type: string;
    name?: (DoraNeoLegacyNameEntity)[] | null;
    amount: string;
    precision: number;
    owner: string;
    admin: string;
}
export interface DoraNeoLegacyNameEntity {
    lang: string;
    name: string;
}
export interface DoraNeoLegacyTransaction {
    txid: string;
    size: number;
    type: string;
    version: number;
    attributes?: (null)[] | null;
    vin?: (DoraNeoLegacyVinEntity)[] | null;
    vout?: (DoraNeoLegacyVoutEntity)[] | null;
    sys_fee: string;
    net_fee: string;
    scripts?: (DoraNeoLegacyScriptsEntity)[] | null;
    time: string;
    block: number;
    jsonsize: number;
}
export interface DoraNeoLegacyVinEntity {
    txid: string;
    vout: number;
}
export interface DoraNeoLegacyVoutEntity {
    n: number;
    asset: string;
    value: string;
    address: string;
}
export interface DoraNeoLegacyScriptsEntity {
    invocation: string;
    verification: string;
}
export interface DoraNeoLegacyTransactionsHistory {
    total_pages: number;
    total_entries: number;
    page_size: number;
    page_number: number;
    entries?: (DoraNeoLegacyEntriesEntity)[] | null;
}
export interface DoraNeoLegacyEntriesEntity {
    txid: string;
    time: number;
    block_height: number;
    asset: string;
    address_to: string;
    address_from: string;
    amount: number;
}
export interface DoraNeoLegacyBalance {
    asset: string;
    balance: string | number;
    asset_name: string;
    symbol: string;
}
export interface DoraNeoLegacyUnclaimed {
    available: number;
    unavailable: number;
    unclaimed: number;
}
