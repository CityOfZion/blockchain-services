import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'
import { BSError } from './error'

export type UntilIndexRecord<N extends string = string> = Partial<Record<N, Record<string, number>>>

export type Account<N extends string = string> = {
  key: string
  type: 'wif' | 'privateKey' | 'publicKey'
  address: string
  bip44Path?: string
  isHardware?: boolean
  blockchain: N
}

export type Token = {
  symbol: string
  name: string
  hash: string
  decimals: number
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type TNetworkId<T extends string = string> = T | (string & {})

export type TNetworkType = 'mainnet' | 'testnet' | 'custom'

export type TNetwork<T extends string = string> = {
  id: TNetworkId<T>
  name: string
  url: string
  type: TNetworkType
}

export type IntentTransferParam = {
  receiverAddress: string
  tokenHash: string
  amount: string
  tokenDecimals?: number
}

export type TransferParam<N extends string = string> = {
  senderAccount: Account<N>
  intents: IntentTransferParam[]
  tipIntent?: IntentTransferParam
  priorityFee?: string
}

export interface IBlockchainService<N extends string = string, A extends string = string> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly feeToken: Token
  readonly isMultiTransferSupported: boolean
  readonly isCustomNetworkSupported: boolean

  tokens: Token[]
  readonly nativeTokens: Token[]

  network: TNetwork<A>
  readonly defaultNetwork: TNetwork<A>
  readonly availableNetworks: TNetwork<A>[]

  exchangeDataService: IExchangeDataService
  blockchainDataService: IBlockchainDataService
  tokenService: ITokenService

  testNetwork: (network: TNetwork<A>) => Promise<void>
  setNetwork: (partialNetwork: TNetwork<A>) => void
  generateAccountFromMnemonic(mnemonic: string, index: number): Account<N>
  generateAccountFromKey(key: string): Account<N>
  validateAddress(address: string): boolean
  validateKey(key: string): boolean
  transfer(param: TransferParam<N>): Promise<string[]>
}

export interface IBSWithEncryption<N extends string = string> {
  decrypt(keyOrJson: string, password: string): Promise<Account<N>>
  encrypt(key: string, password: string): Promise<string>
  validateEncrypted(keyOrJson: string): boolean
}

export interface IBSWithFee<N extends string = string> {
  calculateTransferFee(param: TransferParam<N>): Promise<string>
}
export interface IBSWithClaim<N extends string = string> {
  readonly claimToken: Token
  readonly burnToken: Token

  claimDataService: IClaimDataService

  claim(account: Account<N>): Promise<string>
}
export interface IBSWithNameService {
  resolveNameServiceDomain(domainName: string): Promise<string>
  validateNameServiceDomainFormat(domainName: string): boolean
}

export interface IBSWithExplorer {
  explorerService: IExplorerService
}

export interface IBSWithNft {
  nftDataService: INftDataService
}

export interface IBSWithLedger<N extends string = string> {
  ledgerService: ILedgerService<N>
  generateAccountFromPublicKey(publicKey: string): Account<N>
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
export interface IBlockchainDataService {
  readonly maxTimeToConfirmTransactionInMs: number

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

export interface IClaimDataService {
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
export interface IExchangeDataService {
  getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]>
  getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]>
  getCurrencyRatio(currency: string): Promise<number>
}
export type NftResponse = {
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
export type NftsResponse = {
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
export interface INftDataService {
  getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>
  getNft(params: GetNftParam): Promise<NftResponse>
  hasToken(params: HasTokenParam): Promise<boolean>
}

export type BuildNftUrlParams = {
  collectionHash: string
  tokenHash: string
}
export interface IExplorerService {
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

export type GetLedgerTransport<N extends string = string> = (account: Account<N>) => Promise<Transport>

export interface ILedgerService<N extends string = string> {
  emitter: LedgerServiceEmitter
  getLedgerTransport?: GetLedgerTransport<N>
  getAccounts(transport: Transport, getUntilIndex?: UntilIndexRecord<N>): Promise<Account<N>[]>
  getAccount(transport: Transport, index: number): Promise<Account<N>>
}

export type TSwapToken<N extends string = string> = {
  id: string
  blockchain?: N
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

export type TSwapOrchestratorEvents<N extends string = string> = {
  accountToUse: (account: TSwapValidateValue<Account<N>>) => void | Promise<void>
  amountToUse: (amount: TSwapLoadableValue<string>) => void | Promise<void>
  amountToUseMinMax: (minMax: TSwapLoadableValue<TSwapMinMaxAmount>) => void | Promise<void>
  tokenToUse: (token: TSwapLoadableValue<TSwapToken<N>>) => void | Promise<void>
  availableTokensToUse: (tokens: TSwapLoadableValue<TSwapToken<N>[]>) => void | Promise<void>
  addressToReceive: (account: TSwapValidateValue<string>) => void | Promise<void>
  extraIdToReceive: (extraIdToReceive: TSwapValidateValue<string>) => void
  amountToReceive: (amount: TSwapLoadableValue<string>) => void | Promise<void>
  tokenToReceive: (token: TSwapLoadableValue<TSwapToken<N>>) => void | Promise<void>
  availableTokensToReceive: (tokens: TSwapLoadableValue<TSwapToken<N>[]>) => void | Promise<void>
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

export interface ISwapOrchestrator<N extends string = string> {
  eventEmitter: TypedEmitter<TSwapOrchestratorEvents<N>>

  setTokenToUse(token: TSwapToken<N> | null): Promise<void>
  setAccountToUse(account: Account<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setTokenToReceive(token: TSwapToken<N> | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraIdToReceive(extraId: string | null): Promise<void>
  swap(): Promise<TSwapResult>
  calculateFee(): Promise<string>
}

export type TBridgeToken<N extends string = string> = Token & {
  multichainId: string
  blockchain: N
}

export type TBridgeValue<T> = { value: T | null; loading: boolean; error: BSError | null }

export type TBridgeValidateValue<T> = TBridgeValue<T> & { valid: boolean | null }

export type TBridgeOrchestratorEvents<N extends string = string> = {
  accountToUse: (account: TBridgeValue<Account<N>>) => void | Promise<void>
  amountToUse: (amount: TBridgeValidateValue<string>) => void | Promise<void>
  amountToUseMin: (max: TBridgeValue<string>) => void | Promise<void>
  amountToUseMax: (max: TBridgeValue<string>) => void | Promise<void>
  tokenToUse: (token: TBridgeValue<TBridgeToken<N>>) => void | Promise<void>
  availableTokensToUse: (tokens: TBridgeValue<TBridgeToken<N>[]>) => void | Promise<void>
  addressToReceive: (account: TBridgeValidateValue<string>) => void | Promise<void>
  amountToReceive: (amount: TBridgeValue<string>) => void | Promise<void>
  tokenToReceive: (token: TBridgeValue<TBridgeToken<N>>) => void | Promise<void>
  tokenToUseBalance: (balance: TBridgeValue<BalanceResponse | undefined>) => void | Promise<void>
  bridgeFee: (fee: TBridgeValue<string>) => void | Promise<void>
}

export interface IBridgeOrchestrator<N extends string = string> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<N>>

  setTokenToUse(token: TBridgeToken<N> | null): Promise<void>
  setAccountToUse(account: Account<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setBalances(balances: BalanceResponse[] | null): Promise<void>
  switchTokens(): Promise<void>
  bridge(): Promise<string>
}

export interface IBSWithNeo3NeoXBridge<N extends string = string> {
  neo3NeoXBridgeService: INeo3NeoXBridgeService<N>
}

export type TNeo3NeoXBridgeServiceConstants = {
  bridgeFee: string
  bridgeMaxAmount: string
  bridgeMinAmount: string
}

export type TNeo3NeoXBridgeServiceBridgeParam<N extends string = string> = {
  account: Account<N>
  receiverAddress: string
  amount: string
  token: TBridgeToken<N>
  bridgeFee: string
}

export type TNeo3NeoXBridgeServiceGetApprovalParam<N extends string = string> = {
  account: Account<N>
  amount: string
  token: TBridgeToken<N>
}

export type TNeo3NeoXBridgeServiceGetNonceParams<N extends string = string> = {
  token: TBridgeToken<N>
  transactionHash: string
}

export type TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<N extends string = string> = {
  token: TBridgeToken<N>
  nonce: string
}
export interface INeo3NeoXBridgeService<N extends string = string> {
  readonly tokens: TBridgeToken<N>[]
  getApprovalFee(params: TNeo3NeoXBridgeServiceGetApprovalParam): Promise<string>
  getBridgeConstants(token: TBridgeToken): Promise<TNeo3NeoXBridgeServiceConstants>
  bridge(params: TNeo3NeoXBridgeServiceBridgeParam<N>): Promise<string>
  getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<N>): Promise<string>
  getTransactionHashByNonce(params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<N>): Promise<string>
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
