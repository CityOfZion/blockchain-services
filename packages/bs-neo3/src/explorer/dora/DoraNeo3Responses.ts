//Transaction interfaces
export interface DoraNeo3Signer {
    account: string;
    scopes: string;
}

export interface DoraNeo3Witness {
    invocation: string;
    verification: string;
}

export interface DoraNeo3Transaction {
    hash: string;
    size: number;
    version: number;
    nonce: number;
    sender: string;
    sysfee: string;
    netfee: string;
    validuntilblock: number;
    signers: DoraNeo3Signer[];
    attributes: any[];
    script: string;
    witnesses: DoraNeo3Witness[];
    block: number;
    jsonsize: number;
    time: string;
}
//*******************************************
//Consensus Nodes interfaces
export interface DoraNeo3ConsensusNode {
    url: string;
    height: number;
}
//*******************************************

//Transaction History interface
export interface DoraNeo3Metadata {
    summary: string;
    symbol: string;
    contract_name: string;
    scripthash: string;
    from: string;
    to: string;
    amount: number;
    data: string;
    voter: string;
    candidate: string;
    candidate_name: string;
}

export interface DoraNeo3Invocation {
    type: string;
    metadata: DoraNeo3Metadata;
}

export interface DoraNeo3Transfer {
    from: string;
    to: string;
    time: string;
    scripthash: string;
    amount: string;
    block: number;
    txid: string;
    transferindex: string;
}

export interface DoraNeo3HistoryState {
    type: string;
    value: string;
}

export interface DoraNeo3Notification {
    contract: string;
    event_name: string;
    state: DoraNeo3HistoryState[];
}

export interface DoraNeo3Item {
    block: number;
    hash: string;
    invocations: DoraNeo3Invocation[];
    netfee: string;
    sender: string;
    sysfee: string;
    time: string;
    transfers: DoraNeo3Transfer[];
    vmstate: string;
    notifications: DoraNeo3Notification[];
}

export interface DoraNeo3TransactionHistory {
    items: DoraNeo3Item[];
    totalCount: number;
}
//******************************************************************************
//Balance interface
export interface DoraNeo3Balance {
    asset: string;
    asset_name: string;
    symbol: string;
    balance: number;
}
//******************************************************************************

//Contract interface
export interface DoraNeo3Token {
    hash: string;
    method: string;
    paramcount: number;
    hasreturnvalue: boolean;
    callflags: string;
}

export interface DoraNeo3Nef {
    magic: number;
    compiler: string;
    source: string;
    tokens: DoraNeo3Token[];
    script: string;
    checksum: number;
}

export interface DoraNeo3Features {}

export interface DoraNeo3Parameter {
    name: string;
    type: string;
}

export interface DoraNeo3Method {
    name: string;
    parameters: DoraNeo3Parameter[];
    returntype: string;
    offset: number;
    safe: boolean;
}

export interface DoraNeo3Event {
    name: string;
    parameters: DoraNeo3Parameter[];
}

export interface DoraNeo3Abi {
    methods: DoraNeo3Method[];
    events: DoraNeo3Event[];
}

export interface DoraNeo3Permission {
    contract: string;
    methods: string[];
}

export interface DoraNeo3Manifest {
    name: string;
    groups: any[];
    features: DoraNeo3Features;
    supportedstandards: string[];
    abi: DoraNeo3Abi;
    permissions: DoraNeo3Permission[];
    trusts: any[];
    extra?: any;
}

export interface DoraNeo3Contract {
    id: number;
    updatecounter: number;
    hash: string;
    nef: DoraNeo3Nef;
    manifest: DoraNeo3Manifest;
    block: number;
    time: string;
}
//******************************************************************************
//Asset interface
export interface DoraNeo3Method {
    name: string;
    parameters: DoraNeo3Parameter[];
    returntype: string;
    offset: number;
    safe: boolean;
}

export interface DoraNeo3Abi {
    methods: DoraNeo3Method[];
    events: DoraNeo3Event[];
}

export interface DoraNeo3AssetState {
    id: number;
    updatecounter: number;
    hash: string;
    nef: DoraNeo3Nef;
    manifest: DoraNeo3Manifest;
}

export interface DoraNeo3Asset{
    name: string;
    scripthash: string;
    firstseen: number;
    symbol: string;
    decimals: string;
    state: DoraNeo3AssetState;
    type: string;
    time: string;
}
//******************************************************************************