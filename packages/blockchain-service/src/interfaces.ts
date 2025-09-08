import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'
import { BSError } from './error'

export type UntilIndexRecord<BSName extends string = string> = Partial<Record<BSName, Record<string, number>>>

export type Account<BSName extends string = string> = {
  key: string
  type: 'wif' | 'privateKey' | 'publicKey'
  address: string
  bip44Path?: string
  isHardware?: boolean
  blockchain: BSName
}

export type Token = {
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

export type TransferParam<BSName extends string = string> = {
  senderAccount: Account<BSName>
  intents: IntentTransferParam[]
  tipIntent?: IntentTransferParam
  priorityFee?: string
}

export interface BlockchainService<BSName extends string = string, BSAvailableNetworks extends string = string> {
  readonly name: BSName
  readonly bip44DerivationPath: string
  readonly feeToken: Token
  exchangeDataService: ExchangeDataService
  blockchainDataService: BlockchainDataService
  tokenService: ITokenService
  tokens: Token[]
  nativeTokens: Token[]
  network: Network<BSAvailableNetworks>
  testNetwork: (network: Network<BSAvailableNetworks>) => Promise<void>
  setNetwork: (partialNetwork: Network<BSAvailableNetworks>) => void
  generateAccountFromMnemonic(mnemonic: string, index: number): Account<BSName>
  generateAccountFromKey(key: string): Account<BSName>
  validateAddress(address: string): boolean
  validateKey(key: string): boolean
  transfer(param: TransferParam<BSName>): Promise<string[]>
}

export interface BSWithEncryption<BSName extends string = string> {
  decrypt(keyOrJson: string, password: string): Promise<Account<BSName>>
  encrypt(key: string, password: string): Promise<string>
  validateEncrypted(keyOrJson: string): boolean
}

export interface BSCalculableFee<BSName extends string = string> {
  calculateTransferFee(param: TransferParam<BSName>): Promise<string>
}
export interface BSClaimable<BSName extends string = string> {
  readonly claimToken: Token
  readonly burnToken: Token
  blockchainDataService: BlockchainDataService & BDSClaimable
  claim(account: Account<BSName>): Promise<string>
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

export interface BSWithLedger<BSName extends string = string> {
  ledgerService: LedgerService<BSName>
  generateAccountFromPublicKey(publicKey: string): Account<BSName>
}

export type TransactionNotificationTypedResponse = {
  type: string
  value?: string
}

export type TransactionNotificationStateResponse = {
  type: string
  value?: string | TransactionNotificationTypedResponse[]
}

export type TransactionNotifications = {
  eventName: string
  state?: TransactionNotificationStateResponse | TransactionNotificationStateResponse[]
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
  tokenHash: string
  to: string
  from: string
  type: 'nft'
  collectionHash: string
}

type TransactionDefaultResponse = {
  type: 'default'
}

export type TransactionBridgeNeo3NeoXResponse = {
  type: 'bridgeNeo3NeoX'
  data: {
    amount: string
    token: TBridgeToken
    receiverAddress: string
  }
}

export type TransactionResponse = {
  hash: string
  block: number
  time: number
  transfers: (TransactionTransferAsset | TransactionTransferNft)[]
  fee?: string
  notifications: TransactionNotifications[]
} & (TransactionDefaultResponse | TransactionBridgeNeo3NeoXResponse)

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

export type FullTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
  pageSize?: number
  nextCursor?: string
}

export type ExportTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
}

export type FullTransactionNftEvent = {
  eventType: 'nft'
  amount?: string
  methodName: string
  collectionHash: string
  collectionHashUrl?: string
  to?: string
  toUrl?: string
  from?: string
  fromUrl?: string
  tokenType: 'generic' | (string & NonNullable<unknown>)
  tokenHash?: string
  nftImageUrl?: string
  nftUrl?: string
  name?: string
  collectionName?: string
}

export type FullTransactionAssetEvent = {
  eventType: 'token'
  amount?: string
  methodName: string
  contractHash: string
  contractHashUrl?: string
  to?: string
  toUrl?: string
  from?: string
  fromUrl?: string
  token?: Token
  tokenType: 'generic' | (string & NonNullable<unknown>)
}

type FullTransactionsItemDefault = {
  type: 'default'
}

export type FullTransactionsItemBridgeNeo3NeoX = {
  type: 'bridgeNeo3NeoX'
  data: {
    amount: string
    token: TBridgeToken
    receiverAddress: string
  }
}

export type FullTransactionsItem = {
  txId: string
  txIdUrl?: string
  block: number
  date: string
  invocationCount: number
  notificationCount: number
  networkFeeAmount?: string
  systemFeeAmount?: string
  events: (FullTransactionAssetEvent | FullTransactionNftEvent)[]
} & (FullTransactionsItemDefault | FullTransactionsItemBridgeNeo3NeoX)

export type FullTransactionsByAddressResponse = {
  nextCursor?: string
  data: FullTransactionsItem[]
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
  getFullTransactionsByAddress(params: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse>
  exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string>
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
  hash: string
  collection: {
    name?: string
    image?: string
    hash: string
  }
  creator: {
    address: string
    name?: string
  }
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
  tokenHash: string
  collectionHash: string
}
export type HasTokenParam = {
  address: string
  collectionHash: string
}
export interface NftDataService {
  getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>
  getNft(params: GetNftParam): Promise<NftResponse>
  hasToken(params: HasTokenParam): Promise<boolean>
}

export type BuildNftUrlParams = {
  collectionHash: string
  tokenHash: string
}
export interface ExplorerService {
  buildTransactionUrl(hash: string): string
  buildContractUrl(contractHash: string): string
  buildNftUrl(params: BuildNftUrlParams): string
  getAddressTemplateUrl(): string | undefined
  getTxTemplateUrl(): string | undefined
  getNftTemplateUrl(): string | undefined
  getContractTemplateUrl(): string | undefined
}

export type LedgerServiceEmitter = TypedEmitter<{
  getSignatureStart(): void | Promise<void>
  getSignatureEnd(): void | Promise<void>
}>

export type GetLedgerTransport<BSName extends string = string> = (account: Account<BSName>) => Promise<Transport>

export interface LedgerService<BSName extends string = string> {
  emitter: LedgerServiceEmitter
  getLedgerTransport?: GetLedgerTransport<BSName>
  getAccounts(transport: Transport, getUntilIndex?: UntilIndexRecord<BSName>): Promise<Account<BSName>[]>
  getAccount(transport: Transport, index: number): Promise<Account<BSName>>
}

export type TSwapToken<BSName extends string = string> = {
  id: string
  blockchain?: BSName
  imageUrl?: string
  symbol: string
  name: string
  hash?: string
  decimals?: number
  addressTemplateUrl?: string
  txTemplateUrl?: string
  network?: string
  hasExtraId: boolean
}

export type TSwapLoadableValue<T> = { loading: boolean; value: T | null }
export type TSwapValidateValue<T> = TSwapLoadableValue<T> & { valid: boolean | null }

export type TSwapMinMaxAmount = {
  min: string
  max: string | null
}

export type TSwapOrchestratorEvents<BSName extends string = string> = {
  accountToUse: (account: TSwapValidateValue<Account<BSName>>) => void | Promise<void>
  amountToUse: (amount: TSwapLoadableValue<string>) => void | Promise<void>
  amountToUseMinMax: (minMax: TSwapLoadableValue<TSwapMinMaxAmount>) => void | Promise<void>
  tokenToUse: (token: TSwapLoadableValue<TSwapToken<BSName>>) => void | Promise<void>
  availableTokensToUse: (tokens: TSwapLoadableValue<TSwapToken<BSName>[]>) => void | Promise<void>
  addressToReceive: (account: TSwapValidateValue<string>) => void | Promise<void>
  extraIdToReceive: (extraIdToReceive: TSwapValidateValue<string>) => void
  amountToReceive: (amount: TSwapLoadableValue<string>) => void | Promise<void>
  tokenToReceive: (token: TSwapLoadableValue<TSwapToken<BSName>>) => void | Promise<void>
  availableTokensToReceive: (tokens: TSwapLoadableValue<TSwapToken<BSName>[]>) => void | Promise<void>
  error: (error: string) => void | Promise<void>
}

export type TSwapResult = {
  id: string
  txFrom?: string
  log?: string
}

export type TSwapServiceStatusResponse = {
  status: 'finished' | 'confirming' | 'exchanging' | 'failed' | 'refunded'
  txFrom?: string
  txTo?: string
  log?: string
}
export interface ISwapService {
  getStatus(id: string): Promise<TSwapServiceStatusResponse>
}

export interface ISwapOrchestrator<BSName extends string = string> {
  eventEmitter: TypedEmitter<TSwapOrchestratorEvents<BSName>>

  setTokenToUse(token: TSwapToken<BSName> | null): Promise<void>
  setAccountToUse(account: Account<BSName> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setTokenToReceive(token: TSwapToken<BSName> | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraIdToReceive(extraId: string | null): Promise<void>
  swap(): Promise<TSwapResult>
  calculateFee(): Promise<string>
}

export type TBridgeToken<BSName extends string = string> = Token & {
  multichainId: string
  blockchain: BSName
}

export type TBridgeValue<T> = { value: T | null; loading: boolean; error: BSError | null }

export type TBridgeValidateValue<T> = TBridgeValue<T> & { valid: boolean | null }

export type TBridgeOrchestratorEvents<BSName extends string = string> = {
  accountToUse: (account: TBridgeValue<Account<BSName>>) => void | Promise<void>
  amountToUse: (amount: TBridgeValidateValue<string>) => void | Promise<void>
  amountToUseMin: (max: TBridgeValue<string>) => void | Promise<void>
  amountToUseMax: (max: TBridgeValue<string>) => void | Promise<void>
  tokenToUse: (token: TBridgeValue<TBridgeToken<BSName>>) => void | Promise<void>
  availableTokensToUse: (tokens: TBridgeValue<TBridgeToken<BSName>[]>) => void | Promise<void>
  addressToReceive: (account: TBridgeValidateValue<string>) => void | Promise<void>
  amountToReceive: (amount: TBridgeValue<string>) => void | Promise<void>
  tokenToReceive: (token: TBridgeValue<TBridgeToken<BSName>>) => void | Promise<void>
  tokenToUseBalance: (balance: TBridgeValue<BalanceResponse | undefined>) => void | Promise<void>
  bridgeFee: (fee: TBridgeValue<string>) => void | Promise<void>
}

export interface IBridgeOrchestrator<BSName extends string = string> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<BSName>>

  setTokenToUse(token: TBridgeToken<BSName> | null): Promise<void>
  setAccountToUse(account: Account<BSName> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setBalances(balances: BalanceResponse[] | null): Promise<void>
  switchTokens(): Promise<void>
  bridge(): Promise<string>
}

export interface IBSWithNeo3NeoXBridge<BSName extends string = string> {
  neo3NeoXBridgeService: INeo3NeoXBridgeService<BSName>
}

export type TNeo3NeoXBridgeServiceConstants = {
  bridgeFee: string
  bridgeMaxAmount: string
  bridgeMinAmount: string
}

export type TNeo3NeoXBridgeServiceBridgeParam<BSName extends string = string> = {
  account: Account<BSName>
  receiverAddress: string
  amount: string
  token: TBridgeToken<BSName>
  bridgeFee: string
}

export type TNeo3NeoXBridgeServiceGetApprovalParam<BSName extends string = string> = {
  account: Account<BSName>
  amount: string
  token: TBridgeToken<BSName>
}

export type TNeo3NeoXBridgeServiceGetNonceParams<BSName extends string = string> = {
  token: TBridgeToken<BSName>
  transactionHash: string
}

export type TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<BSName extends string = string> = {
  token: TBridgeToken<BSName>
  nonce: string
}
export interface INeo3NeoXBridgeService<BSName extends string = string> {
  tokens: TBridgeToken<BSName>[]
  getApprovalFee(params: TNeo3NeoXBridgeServiceGetApprovalParam): Promise<string>
  getBridgeConstants(token: TBridgeToken): Promise<TNeo3NeoXBridgeServiceConstants>
  bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string>
  getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<BSName>): Promise<string>
  getTransactionHashByNonce(params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<BSName>): Promise<string>
}

export type TTokenServicePredicateParams = {
  hash: string
  symbol?: string
}

export type TTokenServicePredicateByHashParams = string | { hash: string }

export type TTokenServicePredicateBySymbolParams = string | { symbol: string }

export interface ITokenService {
  predicate(compareFrom: TTokenServicePredicateParams, compareTo: TTokenServicePredicateParams): boolean
  predicateByHash(
    compareFrom: TTokenServicePredicateByHashParams,
    compareTo: TTokenServicePredicateByHashParams
  ): boolean
  predicateBySymbol(
    compareFrom: TTokenServicePredicateBySymbolParams,
    compareTo: TTokenServicePredicateBySymbolParams
  ): boolean
  normalizeToken<T extends Token | Token[]>(token: T): T
  normalizeHash(hash: string): string
}
