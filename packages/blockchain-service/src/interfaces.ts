import Transport from '@ledgerhq/hw-transport'

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Account = {
  key: string
  type: 'wif' | 'privateKey' | 'publicKey'
  address: string
}
export type AccountWithDerivationPath = Account & {
  derivationPath: string
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
  amount: string
  tokenDecimals?: number
}

export type TransferParam = {
  senderAccount: Account
  intent: IntentTransferParam
  tipIntent?: IntentTransferParam
  priorityFee?: string
  isLedger?: boolean
}

export interface BlockchainService<BSCustomName extends string = string> {
  readonly blockchainName: BSCustomName
  readonly derivationPath: string
  readonly feeToken: Token
  exchangeDataService: ExchangeDataService
  blockchainDataService: BlockchainDataService
  tokens: Token[]
  network: Network
  setNetwork: (network: PartialBy<Network, 'url'>) => void
  generateAccountFromMnemonic(mnemonic: string | string, index: number): AccountWithDerivationPath
  generateAccountFromKey(key: string): Account
  decrypt(keyOrJson: string, password: string): Promise<Account>
  encrypt(key: string, password: string): Promise<string>
  validateAddress(address: string): boolean
  validateEncrypted(keyOrJson: string): boolean
  validateKey(key: string): boolean
  transfer(param: TransferParam): Promise<string>
}

export interface BSCalculableFee {
  calculateTransferFee(param: TransferParam, details?: boolean): Promise<string>
}
export interface BSClaimable {
  readonly claimToken: Token
  readonly burnToken: Token
  blockchainDataService: BlockchainDataService & BDSClaimable
  claim(account: Account, isLedger?: boolean): Promise<string>
}
export interface BSWithNameService {
  resolveNameServiceDomain(domainName: string): Promise<string>
  validateNameServiceDomainFormat(domainName: string): boolean
}

export interface BSWithExplorerService {
  explorerService: ExplorerService
}

export interface BSWithNft {
  nftDataService: NftDataService
}

export interface BSWithLedger {
  ledgerService: LedgerService
  generateAccountFromPublicKey(publicKey: string): Account
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
  type: 'token'
  contractHash: string
  token?: Token
}
export type TransactionTransferNft = {
  tokenId: string
  to: string
  from: string
  type: 'nft'
  contractHash: string
}
export type TransactionResponse = {
  hash: string
  block: number
  time: number
  transfers: (TransactionTransferAsset | TransactionTransferNft)[]
  fee?: string
  notifications: TransactionNotifications[]
}
export type ContractParameter = {
  name: string
  type: string
}
export type TransactionsByAddressResponse = {
  totalCount: number
  limit: number
  transactions: TransactionResponse[]
}
export type TransactionsByAddressParams = {
  address: string
  page?: number
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
  amount: string
  token: Token
}
export type RpcResponse = {
  latency: number
  url: string
  height: number
}
export interface BlockchainDataService {
  maxTimeToConfirmTransactionInMs: number
  getTransaction(txid: string): Promise<TransactionResponse>
  getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse>
  getContract(contractHash: string): Promise<ContractResponse>
  getTokenInfo(tokenHash: string): Promise<Token>
  getBalance(address: string): Promise<BalanceResponse[]>
  getBlockHeight(): Promise<number>
  getRpcList(): Promise<RpcResponse[]>
}

export interface BDSClaimable {
  getUnclaimed(address: string): Promise<string>
}

export type TokenPricesResponse = {
  price: number
  symbol: string
  hash: string
}
export type TokenPricesHistoryResponse = {
  price: number
  timestamp: number
  symbol: string
  hash: string
}
export type Currency = 'USD' | 'BRL' | 'EUR'
export type GetTokenPriceHistory = {
  tokenSymbol: string
  currency: Currency
  type: 'hour' | 'day'
  limit: number
}
export interface ExchangeDataService {
  getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]>
  getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]>
}
export interface NftResponse {
  id: string
  contractHash: string
  collectionName?: string
  creator: {
    address: string
    name?: string
  }
  collectionImage?: string
  symbol: string
  image?: string
  name?: string
  isSVG?: boolean
}
export interface NftsResponse {
  items: NftResponse[]
  nextCursor?: string
  total?: number
}

export type GetNftsByAddressParams = {
  address: string
  page?: number
  cursor?: string
  size?: number
}
export type GetNftParam = {
  tokenId: string
  contractHash: string
}
export interface NftDataService {
  getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>
  getNft(params: GetNftParam): Promise<NftResponse>
}

export type BuildNftUrlParams = {
  contractHash: string
  tokenId: string
}
export interface ExplorerService {
  buildTransactionUrl(hash: string): string
  buildNftUrl(params: BuildNftUrlParams): string
}

export interface LedgerService {
  getLedgerTransport?: (account: Account) => Promise<Transport>

  getAddress(transport: Transport): Promise<string>
  getPublicKey(transport: Transport): Promise<string>
}
