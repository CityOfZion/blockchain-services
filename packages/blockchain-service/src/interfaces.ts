export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Account = {
  wif: string
  address: string
}
export interface Token {
  symbol: string
  name: string
  hash: string
  decimals: number
}
export type NetworkType = 'mainnet' | 'testnet' | 'custom'
export type Network = {
  type: NetworkType
  url: string
}
export type IntentTransferParam = {
  receiverAddress: string
  tokenHash: string
  amount: number
  tokenDecimals?: number
}
export type TransferParam = {
  senderAccount: Account
  intents: IntentTransferParam[]
  priorityFee?: number
}

export type TokenPricesResponse = {
  amount: number
  symbol: string
}
export type Currency = 'USD' | 'BRL' | 'EUR'
export interface Exchange {
  readonly network: Network
  getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]>
}
export interface BlockchainService<BSCustomName extends string = string> {
  readonly dataService: BlockchainDataService
  readonly blockchainName: BSCustomName
  readonly feeToken: Token
  readonly exchange: Exchange
  readonly tokens: Token[]
  network: Network
  setNetwork: (network: PartialBy<Network, 'url'>) => void
  generateMnemonic(): string[]
  generateAccount(mnemonic: string[], index: number): Account
  generateAccountFromWif(wif: string): Account
  decryptKey(encryptedKey: string, password: string): Promise<Account>
  validateAddress(address: string): boolean
  validateEncryptedKey(encryptedKey: string): boolean
  validateWif(wif: string): boolean
  transfer(param: TransferParam): Promise<string>
}

export type CalculateTransferFeeResponse = {
  total: number
  systemFee: number
  networkFee: number
}
export interface CalculableFee {
  calculateTransferFee(param: TransferParam, details?: boolean): Promise<CalculateTransferFeeResponse>
}
export interface Claimable {
  dataService: BlockchainDataService & BDSClaimable
  tokenClaim: Token
  claim(account: Account): Promise<string>
}
export interface NeoNameService {
  getOwnerOfNNS(domainName: string): Promise<string>
  validateNNSFormat(domainName: string): boolean
}

export type TransactionNotifications = {
  eventName: string
  state: {
    type: string
    value: string
  }[]
}
export type TransactionTransferAsset = {
  amount: string
  to: string
  from: string
  type: 'asset'
}
export type TransactionTransferNft = {
  tokenId: string
  to: string
  from: string
  type: 'nft'
}
export type TransactionResponse = {
  hash: string
  block: number
  time: string
  transfers: (TransactionTransferAsset | TransactionTransferNft)[]
  sysfee?: string
  netfee?: string
  totfee?: string
  notifications: TransactionNotifications[]
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
export type BalanceResponse = {
  amount: number
  hash: string
  symbol: string
  name: string
  decimals: number
}
export interface BlockchainDataService {
  readonly network: Network
  getTransaction(txid: string): Promise<TransactionResponse>
  getHistoryTransactions(address: string, page: number): Promise<TransactionHistoryResponse>
  getContract(contractHash: string): Promise<ContractResponse>
  getTokenInfo(tokenHash: string): Promise<Token>
  getBalance(address: string): Promise<BalanceResponse[]>
}
export interface BDSClaimable {
  getUnclaimed(address: string): Promise<number>
}
export interface NFTResponse {
  id: string
  contractHash: string
  collectionName?: string
  collectionImage?: string
  symbol: string
  image?: string
  name?: string
  isSVG?: boolean
}
export interface NFTSResponse {
  totalPages: number
  items: NFTResponse[]
}
export interface NftDataService {
  getNFTS(address: string, page: number): Promise<NFTSResponse>
  getNFT(tokenID: string, hash: string): Promise<NFTResponse>
}
