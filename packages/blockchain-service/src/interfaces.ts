import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'
import { BSError } from './error'

export type TUntilIndexRecord<N extends string = string> = Partial<Record<N, Record<string, number>>>

export type TBSAccount<N extends string = string> = {
  key: string
  type: 'wif' | 'privateKey' | 'publicKey'
  address: string
  bip44Path?: string
  isHardware?: boolean
  blockchain: N
}

export type TBSToken = {
  symbol: string
  name: string
  hash: string
  decimals: number
}

export type TBSNetworkId<T extends string = string> = T | (string & {})

export type TBSNetworkType = 'mainnet' | 'testnet' | 'custom'

export type TBSNetwork<T extends string = string> = {
  id: TBSNetworkId<T>
  name: string
  url: string
  type: TBSNetworkType
}

export type TIntentTransferParam = {
  receiverAddress: string
  tokenHash: string
  amount: string
  tokenDecimals?: number
}

export type TTransferParam<N extends string = string> = {
  senderAccount: TBSAccount<N>
  intents: TIntentTransferParam[]
  tipIntent?: TIntentTransferParam
  priorityFee?: string
}

export type TPingNetworkResponse = {
  latency: number
  url: string
  height: number
}

export interface IBlockchainService<N extends string = string, A extends string = string> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly feeToken: TBSToken
  readonly isMultiTransferSupported: boolean
  readonly isCustomNetworkSupported: boolean

  tokens: TBSToken[]
  readonly nativeTokens: TBSToken[]

  network: TBSNetwork<A>
  availableNetworkURLs: string[]
  readonly defaultNetwork: TBSNetwork<A>
  readonly availableNetworks: TBSNetwork<A>[]

  exchangeDataService: IExchangeDataService
  blockchainDataService: IBlockchainDataService
  tokenService: ITokenService

  pingNode: (url: string) => Promise<TPingNetworkResponse>
  setNetwork: (network: TBSNetwork<A>) => void
  generateAccountFromMnemonic(mnemonic: string, index: number): TBSAccount<N>
  generateAccountFromKey(key: string): TBSAccount<N>
  validateAddress(address: string): boolean
  validateKey(key: string): boolean
  transfer(param: TTransferParam<N>): Promise<string[]>
}

export interface IBSWithEncryption<N extends string = string> {
  decrypt(keyOrJson: string, password: string): Promise<TBSAccount<N>>
  encrypt(key: string, password: string): Promise<string>
  validateEncrypted(keyOrJson: string): boolean
}

export interface IBSWithFee<N extends string = string> {
  calculateTransferFee(param: TTransferParam<N>): Promise<string>
}
export interface IBSWithClaim<N extends string = string> {
  readonly claimToken: TBSToken
  readonly burnToken: TBSToken

  claimDataService: IClaimDataService

  claim(account: TBSAccount<N>): Promise<string>
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
  generateAccountFromPublicKey(publicKey: string): TBSAccount<N>
}

export interface IBSWithWalletConnect {
  walletConnectService: IWalletConnectService
}

export type TTransactionNotificationTypedResponse = {
  type: string
  value?: string
}

export type TTransactionNotificationStateResponse = {
  type: string
  value?: string | TTransactionNotificationTypedResponse[]
}

export type TTransactionNotifications = {
  eventName: string
  state?: TTransactionNotificationStateResponse | TTransactionNotificationStateResponse[]
}
export type TTransactionTransferAsset = {
  amount: string
  to: string
  from: string
  type: 'token'
  contractHash: string
  token?: TBSToken
}
export type TTransactionTransferNft = {
  tokenHash: string
  to: string
  from: string
  type: 'nft'
  collectionHash: string
}

type TTransactionDefaultResponse = {
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

export type TTransactionResponse = {
  hash: string
  block: number
  time: number
  transfers: (TTransactionTransferAsset | TTransactionTransferNft)[]
  fee?: string
  notifications: TTransactionNotifications[]
} & (TTransactionDefaultResponse | TransactionBridgeNeo3NeoXResponse)

export type TContractParameter = {
  name: string
  type: string
}
export type TTransactionsByAddressResponse = {
  transactions: TTransactionResponse[]
  nextPageParams?: any
}
export type TTransactionsByAddressParams = {
  address: string
  nextPageParams?: any
}

export type TFullTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
  pageSize?: number
  nextCursor?: string
}

export type TExportTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
}

export type TFullTransactionNftEvent = {
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

export type TFullTransactionAssetEvent = {
  eventType: 'token'
  amount?: string
  methodName: string
  contractHash: string
  contractHashUrl?: string
  to?: string
  toUrl?: string
  from?: string
  fromUrl?: string
  token?: TBSToken
  tokenType: 'generic' | (string & NonNullable<unknown>)
}

type TFullTransactionsItemDefault = {
  type: 'default'
}

export type TFullTransactionsItemBridgeNeo3NeoX = {
  type: 'bridgeNeo3NeoX'
  data: {
    amount: string
    token: TBridgeToken
    receiverAddress: string
  }
}

export type TFullTransactionsItem = {
  txId: string
  txIdUrl?: string
  block: number
  date: string
  invocationCount: number
  notificationCount: number
  networkFeeAmount?: string
  systemFeeAmount?: string
  events: (TFullTransactionAssetEvent | TFullTransactionNftEvent)[]
} & (TFullTransactionsItemDefault | TFullTransactionsItemBridgeNeo3NeoX)

export type TFullTransactionsByAddressResponse = {
  nextCursor?: string
  data: TFullTransactionsItem[]
}

export type TContractMethod = {
  name: string
  parameters: TContractParameter[]
}
export type ContractResponse = {
  hash: string
  name: string
  methods: TContractMethod[]
}
export type TBalanceResponse = {
  amount: string
  token: TBSToken
}

export interface IBlockchainDataService {
  readonly maxTimeToConfirmTransactionInMs: number

  getTransaction(txid: string): Promise<TTransactionResponse>
  getTransactionsByAddress(params: TTransactionsByAddressParams): Promise<TTransactionsByAddressResponse>
  getFullTransactionsByAddress(params: TFullTransactionsByAddressParams): Promise<TFullTransactionsByAddressResponse>
  exportFullTransactionsByAddress(params: TExportTransactionsByAddressParams): Promise<string>
  getContract(contractHash: string): Promise<ContractResponse>
  getTokenInfo(tokenHash: string): Promise<TBSToken>
  getBalance(address: string): Promise<TBalanceResponse[]>
  getBlockHeight(): Promise<number>
}

export interface IClaimDataService {
  getUnclaimed(address: string): Promise<string>
}

export type TTokenPricesResponse = {
  usdPrice: number
  token: TBSToken
}
export type TTokenPricesHistoryResponse = {
  usdPrice: number
  timestamp: number
  token: TBSToken
}

export type TGetTokenPriceHistoryParams = {
  token: TBSToken
  type: 'hour' | 'day'
  limit: number
}
export type TGetTokenPricesParams = {
  tokens: TBSToken[]
}
export interface IExchangeDataService {
  getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]>
  getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]>
  getCurrencyRatio(currency: string): Promise<number>
}
export type TNftResponse = {
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
export type TNftsResponse = {
  items: TNftResponse[]
  nextCursor?: string
  total?: number
}

export type TGetNftsByAddressParams = {
  address: string
  page?: number
  cursor?: string
  size?: number
}
export type TGetNftParam = {
  tokenHash: string
  collectionHash: string
}
export type THasTokenParam = {
  address: string
  collectionHash: string
}
export interface INftDataService {
  getNftsByAddress(params: TGetNftsByAddressParams): Promise<TNftsResponse>
  getNft(params: TGetNftParam): Promise<TNftResponse>
  hasToken(params: THasTokenParam): Promise<boolean>
}

export type TBuildNftUrlParams = {
  collectionHash: string
  tokenHash: string
}
export interface IExplorerService {
  buildTransactionUrl(hash: string): string
  buildContractUrl(contractHash: string): string
  buildNftUrl(params: TBuildNftUrlParams): string
  getAddressTemplateUrl(): string | undefined
  getTxTemplateUrl(): string | undefined
  getNftTemplateUrl(): string | undefined
  getContractTemplateUrl(): string | undefined
}

export type TLedgerServiceEmitter = TypedEmitter<{
  getSignatureStart(): void | Promise<void>
  getSignatureEnd(): void | Promise<void>
}>

export type TGetLedgerTransport<N extends string = string> = (account: TBSAccount<N>) => Promise<Transport>

export interface ILedgerService<N extends string = string> {
  emitter: TLedgerServiceEmitter
  getLedgerTransport?: TGetLedgerTransport<N>
  getAccounts(transport: Transport, getUntilIndex?: TUntilIndexRecord<N>): Promise<TBSAccount<N>[]>
  getAccount(transport: Transport, index: number): Promise<TBSAccount<N>>
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
  accountToUse: (account: TSwapValidateValue<TBSAccount<N>>) => void | Promise<void>
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
  setAccountToUse(account: TBSAccount<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setTokenToReceive(token: TSwapToken<N> | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraIdToReceive(extraId: string | null): Promise<void>
  swap(): Promise<TSwapResult>
  calculateFee(): Promise<string>
}

export type TBridgeToken<N extends string = string> = TBSToken & {
  blockchain: N
  multichainId: string
}

export type TBridgeValue<T> = { value: T | null; loading: boolean; error: BSError | null }

export type TBridgeValidateValue<T> = TBridgeValue<T> & { valid: boolean | null }

export type TBridgeOrchestratorEvents<N extends string = string> = {
  accountToUse: (account: TBridgeValue<TBSAccount<N>>) => void | Promise<void>
  amountToUse: (amount: TBridgeValidateValue<string>) => void | Promise<void>
  amountToUseMin: (max: TBridgeValue<string>) => void | Promise<void>
  amountToUseMax: (max: TBridgeValue<string>) => void | Promise<void>
  tokenToUse: (token: TBridgeValue<TBridgeToken<N>>) => void | Promise<void>
  availableTokensToUse: (tokens: TBridgeValue<TBridgeToken<N>[]>) => void | Promise<void>
  addressToReceive: (account: TBridgeValidateValue<string>) => void | Promise<void>
  amountToReceive: (amount: TBridgeValue<string>) => void | Promise<void>
  tokenToReceive: (token: TBridgeValue<TBridgeToken<N>>) => void | Promise<void>
  tokenToUseBalance: (balance: TBridgeValue<TBalanceResponse | undefined>) => void | Promise<void>
  bridgeFee: (fee: TBridgeValue<string>) => void | Promise<void>
}

export interface IBridgeOrchestrator<N extends string = string> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<N>>

  setTokenToUse(token: TBridgeToken<N> | null): Promise<void>
  setAccountToUse(account: TBSAccount<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setBalances(balances: TBalanceResponse[] | null): Promise<void>
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
  account: TBSAccount<N>
  receiverAddress: string
  amount: string
  token: TBridgeToken<N>
  bridgeFee: string
}

export type TNeo3NeoXBridgeServiceGetApprovalParam<N extends string = string> = {
  account: TBSAccount<N>
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
  readonly gasToken: TBridgeToken<N>
  readonly neoToken: TBridgeToken<N>
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
  normalizeToken<T extends TBSToken | TBSToken[]>(token: T): T
  normalizeHash(hash: string): string
}

export type TWalletConnectServiceRequestMethodParams<N extends string = string> = {
  account: TBSAccount<N>
  params: any
}

export type TWalletConnectServiceRequestMethod = (params: TWalletConnectServiceRequestMethodParams) => Promise<any>

export interface IWalletConnectService {
  readonly namespace: string
  readonly chain: string
  readonly supportedMethods: string[]
  readonly supportedEvents: string[]
  readonly calculableMethods: string[]
  readonly autoApproveMethods: string[]

  calculateRequestFee(args: TWalletConnectServiceRequestMethodParams): Promise<string>

  [methodName: string]: any | TWalletConnectServiceRequestMethod
}
