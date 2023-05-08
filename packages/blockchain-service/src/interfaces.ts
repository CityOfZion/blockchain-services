//Interfaces and Types related to what every blockchains have in common
export type SendTransactionParam = {
    senderAccount: Account
    transactionIntents: IntentTransactionParam[]
    priorityFee?: number
}
export type IntentTransactionParam = {
    receiverAddress: string;
    tokenHash: string;
    amount: number;
};

export type CalculateTransferFeeDetails = {
    systemFee?: string
    networkFee?: string
}
export type Currency = "USD" | "BRL" | "EUR"
export type ExchangeInfo = {
    symbol: string
    amount: number
}
export type ClaimResponse = { txid: string, symbol: string, hash: string }
export interface Claimable {
    claim(account: Account): Promise<ClaimResponse>
    dataService: BlockchainDataService & BDSClaimable
    tokenClaim: {hash: string, symbol: string, decimals: number}
}
export enum NNSRecordTypes {
    IPV4 = "1",
    CANONICAL_NAME = "5",
    TEXT = "16",
    IPV6 = "28",
}
export interface NeoNameService {
    getNNSRecord(domainName: string, type: NNSRecordTypes): Promise<string>;
    getOwnerOfNNS(domainName: string): Promise<string>;
    validateNNSFormat(domainName: string): boolean
}

export type Token = {
    name: string
    symbol: string
    hash: string
    decimals: number
}
export type Account = { 
    wif: string
    address: string
}
export type CalculateTransferFeeResponse = { result: number, details?: CalculateTransferFeeDetails }

export interface BlockchainService<BSCustomName extends string = string> {
    readonly dataService: BlockchainDataService
    readonly blockchainName: BSCustomName
    readonly derivationPath: string
    readonly feeToken: { hash: string, symbol: string, decimals: number }
    readonly exchange: Exchange
    readonly tokens: Token[]
    sendTransaction(param: SendTransactionParam): Promise<string>
    generateMnemonic(): string
    generateWif(mnemonic: string, index: number): string
    generateAccount(mnemonic: string, index: number): Account
    generateAccountFromWif(wif: string): string
    decryptKey(encryptedKey: string, password: string): Promise<Account>
    validateAddress(address: string): boolean
    validateEncryptedKey(encryptedKey: string): boolean
    validateWif(wif: string): boolean
    calculateTransferFee(param: SendTransactionParam, details?: boolean): Promise<CalculateTransferFeeResponse>
}
//****************************************************************************
//Interfaces and Types related to blockchain queries
export type TransactionNotifications = {
    contract: string
    event_name: string
    state: {
        type: string,
        value: string
    }[]
}
export type TransactionResponse = {
    txid: string
    block: number
    time: string
    transfers: Omit<TransactionTransfer, 'txid'>[]
    sysfee: string
    netfee: string
    totfee: string
    notifications: TransactionNotifications[]
}
export type TransactionTransfer = {
    amount: string
    to: string
    from: string
    hash: string
    txid: string
}
export type ContractParameter = {
    name: string
    type: string
}
export type TransactionHistoryResponse = {
    totalCount: number
    transactions: TransactionResponse[]
}
export type ContractMethod = {
    name: string
    parameters: ContractParameter[]
}
export type ContractResponse = {
    hash: string
    name: string
    methods: ContractMethod[]
}
export type ConsensusNodeResponse = {
    url: string,
    height: number
}
export type TokenInfoResponse = { symbol: string; decimals: number }
export type BlockchainNetwork = "mainnet" | "testnet" | "privatenet"
export type BalanceResponse = {
    amount: number
    hash: string
    symbol: string
    name: string
}
export type UnclaimedResponse = {
    address: string
    unclaimed: number
}
export interface BDSClaimable {
    getUnclaimed(address: string): Promise<UnclaimedResponse>
}
export interface BlockchainDataService {
    readonly explorer: string
    network: BlockchainNetwork
    setNetwork(network: BlockchainNetwork): void
    getTransaction(txid: string): Promise<TransactionResponse>
    getHistoryTransactions(address: string, page: number): Promise<TransactionHistoryResponse>
    getContract(contractHash: string): Promise<ContractResponse>
    getTokenInfo(tokenHash: string): Promise<TokenInfoResponse>
    getBalance(address: string): Promise<BalanceResponse[]>
    getAllNodes(): Promise<ConsensusNodeResponse[]>
    getHigherNode(): Promise<ConsensusNodeResponse>
}
//****************************************************************************
//Interface and Types related to Exchanges
export type ToeknPricesResponse = {
    amount: number;
    Symbol: string;
}
export interface Exchange {
    getTokenPrices(currency: Currency): Promise<ToeknPricesResponse[]>
}
//*****************************************************************************