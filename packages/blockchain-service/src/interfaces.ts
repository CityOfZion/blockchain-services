import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'

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

// eslint-disable-next-line @typescript-eslint/ban-types
export type NetworkId<T extends string = string> = T | (string & {})

export type Network<T extends string = string> = {
  id: NetworkId<T>
  name: string
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

export interface BlockchainService<BSCustomName extends string = string, BSAvailableNetworks extends string = string> {
  readonly blockchainName: BSCustomName
  readonly derivationPath: string
  readonly feeToken: Token
  exchangeDataService: ExchangeDataService
  blockchainDataService: BlockchainDataService
  tokens: Token[]
  network: Network<BSAvailableNetworks>
  setNetwork: (partialNetwork: Network<BSAvailableNetworks>) => void
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
  transactions: TransactionResponse[]
  nextPageParams?: any
}
export type TransactionsByAddressParams = {
  address: string
  nextPageParams?: any
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
  usdPrice: number
  token: Token
}
export type TokenPricesHistoryResponse = {
  usdPrice: number
  timestamp: number
  token: Token
}

export type GetTokenPriceHistoryParams = {
  token: Token
  type: 'hour' | 'day'
  limit: number
}
export type GetTokenPricesParams = {
  tokens: Token[]
}
export interface ExchangeDataService {
  getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]>
  getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]>
  getCurrencyRatio(currency: string): Promise<number>
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
export type HasTokenParam = {
  address: string
  contractHash: string
}
export interface NftDataService {
  getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>
  getNft(params: GetNftParam): Promise<NftResponse>
  hasToken(params: HasTokenParam): Promise<boolean>
}

export type BuildNftUrlParams = {
  contractHash: string
  tokenId: string
}
export interface ExplorerService {
  buildTransactionUrl(hash: string): string
  buildContractUrl(contractHash: string): string
  buildNftUrl(params: BuildNftUrlParams): string
}

export type LedgerServiceEmitter = TypedEmitter<{
  getSignatureStart(): void | Promise<void>
  getSignatureEnd(): void | Promise<void>
}>
export interface LedgerService {
  emitter: LedgerServiceEmitter
  getLedgerTransport?: (account: Account) => Promise<Transport>
  getAddress(transport: Transport): Promise<string>
  getPublicKey(transport: Transport): Promise<string>
}

export type SwapRoute = {
  tokenToUse: Token
  reserveTokenToUse: string
  tokenToReceive: Token
  reserveTokenToReceive: string
}

export type SwapServiceEvents = {
  accountToUse: (account: Account | null) => void | Promise<void>
  amountToUse: (amount: string | null) => void | Promise<void>
  tokenToUse: (token: Token | null) => void | Promise<void>
  reservesToUse: (reserves: string | null) => void | Promise<void>
  amountToReceive: (amount: string | null) => void | Promise<void>
  tokenToReceive: (token: Token | null) => void | Promise<void>
  reservesToReceive: (reserves: string | null) => void | Promise<void>
  minimumReceived: (minimumReceived: string | null) => void | Promise<void>
  maximumSelling: (maximumSelling: string | null) => void | Promise<void>
  deadline: (deadline: string) => void | Promise<void>
  slippage: (slippage: number) => void | Promise<void>
  liquidityProviderFee: (liquidityProviderFee: string | null) => void | Promise<void>
  priceImpact: (priceImpact: string | null) => void | Promise<void>
  priceInverse: (priceInverse: string | null) => void | Promise<void>
  route: (route: SwapRoute[] | null) => void | Promise<void>
  lastAmountChanged: (lastAmountChanged: 'amountToUse' | 'amountToReceive' | null) => void | Promise<void>
}

export type SwapServiceSwapArgs<T extends string> = {
  address: string
  routePath: Token[]
  deadline: string
  network: Network<T>
}

export type SwapServiceSwapToUseArgs<T extends string> = {
  amountToUse: string
  minimumReceived: string
  type: 'swapTokenToUse'
} & SwapServiceSwapArgs<T>

export type SwapServiceSwapToReceiveArgs<T extends string> = {
  amountToReceive: string
  maximumSelling: string
  type: 'swapTokenToReceive'
} & SwapServiceSwapArgs<T>

export type PoolGraph = Record<string, string[]>

export interface SwapService<AvailableNetworkIds extends string> {
  eventEmitter: TypedEmitter<SwapServiceEvents>

  buildSwapInvocationArgs():
    | SwapServiceSwapToUseArgs<AvailableNetworkIds>
    | SwapServiceSwapToReceiveArgs<AvailableNetworkIds>

  setAccountToUse(account: Account | null): void
  setAmountToUse(amount: string | null): void
  setAmountToReceive(amount: string | null): void
  setDeadline(deadline: string): void
  setSlippage(slippage: number): void

  setTokenToUse(token: Token | null): void
  setTokenToReceive(token: Token | null): void

  startListeningBlockGeneration(): void
  stopListeningBlockGeneration(): void

  listSwappableTokens(network: Network<AvailableNetworkIds>): PoolGraph

  swap(isLedger?: boolean): void
}
