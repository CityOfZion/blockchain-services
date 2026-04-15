import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'
import type { BSError } from './error'

// Core

export type TUntilIndexRecord<N extends string> = Partial<Record<N, Record<string, number>>>

export type TBSAccount<N extends string> = {
  key: string
  type: 'wif' | 'privateKey' | 'publicKey'
  address: string
  bipPath?: string
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

// Blockchain Service

export type TPingNetworkResponse = {
  latency: number
  url: string
  height: number
}

export interface IBlockchainService<N extends string, A extends string = string> {
  readonly name: N
  readonly bipDerivationPath: string
  readonly feeToken: TBSToken
  readonly isMultiTransferSupported: boolean
  readonly amountToCreateAccount?: string

  tokens: TBSToken[]
  readonly nativeTokens: TBSToken[]

  networkUrls: string[]
  network: TBSNetwork<A>
  readonly defaultNetwork: TBSNetwork<A>
  readonly availableNetworks: TBSNetwork<A>[]
  readonly isCustomNetworkSupported: boolean

  exchangeDataService: IExchangeDataService
  blockchainDataService: IBlockchainDataService<N>
  tokenService: ITokenService

  setNetwork(network: TBSNetwork<A>): void
  pingNetwork(url?: string): Promise<TPingNetworkResponse>
  generateAccountFromMnemonic(mnemonic: string, index: number): Promise<TBSAccount<N>>
  generateAccountFromKey(key: string): Promise<TBSAccount<N>>
  validateAddress(address: string): boolean
  validateKey(key: string): boolean
  transfer(params: TTransferParams<N>): Promise<TTransaction<N>[]>
}

// Transfer

export type TTransferIntent = {
  receiverAddress: string
  amount: string
  token: TBSToken
}

export type TTransferParams<N extends string> = {
  senderAccount: TBSAccount<N>
  intents: TTransferIntent[]
}

export interface IBSWithFee<N extends string> {
  calculateTransferFee(params: TTransferParams<N>): Promise<string>
}

// Encryption

export interface IBSWithEncryption<N extends string> {
  decrypt(keyOrJson: string, password: string): Promise<TBSAccount<N>>
  encrypt(key: string, password: string): Promise<string>
  validateEncrypted(keyOrJson: string): boolean
}

// Name Service

export interface IBSWithNameService {
  resolveNameServiceDomain(domainName: string): Promise<string>
  validateNameServiceDomainFormat(domainName: string): boolean
}

// Faucet

export interface IBSWithFaucet<N extends string> {
  faucet(address: string): Promise<TTransaction<N>>
}

// Transaction

export type TTransactionBaseEvent = {
  methodName?: string
  from?: string
  fromUrl?: string
  to?: string
  toUrl?: string
  amount?: string
}

export type TTransactionDefaultNftEvent = TTransactionBaseEvent & {
  eventType: 'nft'
  nft?: TNftResponse
}

export type TTransactionDefaultTokenEvent = TTransactionBaseEvent & {
  eventType: 'token'
  tokenUrl?: string
  token?: TBSToken
}

export type TTransactionDefaultGenericEvent = TTransactionBaseEvent & {
  eventType: 'generic'
  data?: Record<string, string | number | boolean | undefined | null>
}

export type TTransactionDefaultEvent =
  | TTransactionDefaultNftEvent
  | TTransactionDefaultTokenEvent
  | TTransactionDefaultGenericEvent

export type TTransactionUtxoInputOutput = {
  address?: string
  addressUrl?: string
  amount: string
  token: TBSToken
}

export type TTransactionBase = {
  txId: string
  txIdUrl?: string
  block?: number
  date: string
  invocationCount?: number
  notificationCount?: number
  networkFeeAmount?: string
  systemFeeAmount?: string
  data?: any
}

export type TTransactionFullBase<N extends string> = TTransactionBase & {
  isPending: boolean
  blockchain: N
  relatedAddress?: string
}

export type TTransactionDefault<N extends string> = TTransactionFullBase<N> & {
  view: 'default'
  events: TTransactionDefaultEvent[]
}

export type TTransactionUtxo<N extends string> = TTransactionFullBase<N> & {
  view: 'utxo'
  hex: string
  totalAmount: string
  nfts: TNftResponse[]
  inputs: TTransactionUtxoInputOutput[]
  outputs: TTransactionUtxoInputOutput[]
}

export type TTransaction<N extends string> = TTransactionDefault<N> | TTransactionUtxo<N>

export type TGetTransactionsByAddressParams = {
  address: string
  nextPageParams?: any
}

export type TGetTransactionsByAddressResponse<N extends string, T extends TTransaction<N> = TTransaction<N>> = {
  nextPageParams?: any
  transactions: T[]
}

// Blockchain Data Service

export type TContractParameter = {
  name: string
  type: string
}

export type TContractMethod = {
  name: string
  parameters: TContractParameter[]
}

export type TContractResponse = {
  hash: string
  name: string
  methods: TContractMethod[]
}

export type TBalanceResponse = {
  amount: string
  token: TBSToken
}

export interface IBlockchainDataService<N extends string> {
  readonly maxTimeToConfirmTransactionInMs: number

  getTransaction(transactionId: string): Promise<TTransaction<N>>
  getTransactionsByAddress(params: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>>
  getContract(contractHash: string): Promise<TContractResponse>
  getTokenInfo(tokenHash: string): Promise<TBSToken>
  getBalance(address: string): Promise<TBalanceResponse[]>
  getBlockHeight(): Promise<number>
}

// Full Transactions

export type TGetFullTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
  pageSize?: number
  nextPageParams?: any
}

export type TExportFullTransactionsByAddressParams = {
  address: string
  dateFrom: string
  dateTo: string
}

export interface IFullTransactionsDataService<N extends string> {
  getFullTransactionsByAddress(
    params: TGetFullTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>>
  exportFullTransactionsByAddress(params: TExportFullTransactionsByAddressParams): Promise<string>
}

export interface IBSWithFullTransactions<N extends string> {
  fullTransactionsDataService: IFullTransactionsDataService<N>
}

// Claim

export type TClaimServiceTransactionData = {
  isClaim: boolean
}

export interface IClaimService<N extends string> {
  readonly claimToken: TBSToken

  getUnclaimed(address: string): Promise<string>
  calculateFee(account: TBSAccount<N>): Promise<string>
  claim(account: TBSAccount<N>): Promise<TTransactionDefault<N>>
  getTransactionData(transaction: TTransactionBase): TClaimServiceTransactionData | undefined
}

export interface IBSWithClaim<N extends string> {
  claimService: IClaimService<N>
}

// Exchange

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

// NFT

export type TNftResponse = {
  hash: string
  explorerUri?: string
  collection?: {
    name?: string
    image?: string
    hash: string
    url?: string
  }
  creator?: {
    address: string
    name?: string
  }
  symbol?: string
  image?: string
  name?: string
  isSVG?: boolean
}

export type TNftsResponse = {
  items: TNftResponse[]
  nextPageParams?: any
}

export type TGetNftsByAddressParams = {
  address: string
  nextPageParams?: any
}

export type TGetNftParams = {
  tokenHash: string
  collectionHash?: string
}

export type THasTokenParams = {
  address: string
  collectionHash: string
}

export interface INftDataService {
  getNftsByAddress(params: TGetNftsByAddressParams): Promise<TNftsResponse>
  getNft(params: TGetNftParams): Promise<TNftResponse>
  hasToken(params: THasTokenParams): Promise<boolean>
}

export interface IBSWithNft {
  nftDataService: INftDataService
}

// Explorer

export type TBuildNftUrlParams = {
  collectionHash?: string
  tokenHash: string
}

export interface IExplorerService {
  buildAddressUrl(address: string): string | undefined
  buildTransactionUrl(transactionId: string): string | undefined
  buildNftUrl(params: TBuildNftUrlParams): string | undefined
  buildContractUrl(contractHash: string): string | undefined
  getAddressTemplateUrl(): string | undefined
  getTransactionTemplateUrl(): string | undefined
  getNftTemplateUrl(): string | undefined
  getContractTemplateUrl(): string | undefined
}

export interface IBSWithExplorer {
  explorerService: IExplorerService
}

// Ledger

export type TLedgerServiceEmitter = TypedEmitter<{
  getSignatureStart(): void | Promise<void>
  getSignatureEnd(): void | Promise<void>
}>

export type TGetLedgerTransport<N extends string> = (account: TBSAccount<N>) => Promise<Transport>

export interface ILedgerService<N extends string> {
  emitter: TLedgerServiceEmitter
  getLedgerTransport?: TGetLedgerTransport<N>
  getAccount(transport: Transport, index: number): Promise<TBSAccount<N>>
  getAccounts(transport: Transport, getUntilIndex?: TUntilIndexRecord<N>): Promise<TBSAccount<N>[]>
}

export interface IBSWithLedger<N extends string> {
  ledgerService: ILedgerService<N>
  generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<N>>
}

// Swap

export type TSwapToken<N extends string> = {
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

export type TSwapOrchestratorEvents<N extends string> = {
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

export type TSwapResponse<N extends string> = {
  id: string
  transaction?: TTransaction<N>
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

export interface ISwapOrchestrator<N extends string> {
  eventEmitter: TypedEmitter<TSwapOrchestratorEvents<N>>

  setTokenToUse(token: TSwapToken<N> | null): Promise<void>
  setAccountToUse(account: TBSAccount<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setTokenToReceive(token: TSwapToken<N> | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraIdToReceive(extraId: string | null): Promise<void>
  swap(): Promise<TSwapResponse<N>>
  calculateFee(): Promise<string>
}

// Bridge

export type TBSBridgeName = 'neo3' | 'neox'

export type TBridgeToken<N extends TBSBridgeName> = TBSToken & {
  blockchain: N
  multichainId: string
}

export type TBridgeValue<T> = { value: T | null; loading: boolean; error: BSError | null }

export type TBridgeValidateValue<T> = TBridgeValue<T> & { valid: boolean | null }

export type TBridgeOrchestratorEvents<N extends TBSBridgeName> = {
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

export interface IBridgeOrchestrator<N extends TBSBridgeName> {
  eventEmitter: TypedEmitter<TBridgeOrchestratorEvents<N>>

  setTokenToUse(token: TBridgeToken<N> | null): Promise<void>
  setAccountToUse(account: TBSAccount<N> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setBalances(balances: TBalanceResponse[] | null): Promise<void>
  switchTokens(): Promise<void>
  bridge(): Promise<string>
}

export type TNeo3NeoXBridgeServiceConstants = {
  bridgeFee: string
  bridgeMaxAmount: string
  bridgeMinAmount: string
}

export type TNeo3NeoXBridgeServiceBridgeParam<N extends TBSBridgeName> = {
  account: TBSAccount<N>
  receiverAddress: string
  amount: string
  token: TBridgeToken<N>
  bridgeFee: string
}

export type TNeo3NeoXBridgeServiceGetApprovalParam<N extends TBSBridgeName> = {
  account: TBSAccount<N>
  amount: string
  token: TBridgeToken<N>
}

export type TNeo3NeoXBridgeServiceGetNonceParams<N extends TBSBridgeName> = {
  token: TBridgeToken<N>
  transactionHash: string
}

export type TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<N extends TBSBridgeName> = {
  token: TBridgeToken<N>
  nonce: string
}

export type TNeo3NeoXBridgeTransactionData<N extends TBSBridgeName> = {
  neo3NeoxBridge: {
    tokenToUse: TBridgeToken<N>
    receiverAddress: string
    amount: string
  }
}

export interface INeo3NeoXBridgeService<N extends TBSBridgeName> {
  readonly gasToken: TBridgeToken<N>
  readonly neoToken: TBridgeToken<N>
  getApprovalFee(params: TNeo3NeoXBridgeServiceGetApprovalParam<N>): Promise<string>
  getBridgeConstants(token: TBridgeToken<N>): Promise<TNeo3NeoXBridgeServiceConstants>
  bridge(params: TNeo3NeoXBridgeServiceBridgeParam<N>): Promise<string>
  getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<N>): Promise<string>
  getTransactionHashByNonce(params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<N>): Promise<string>
  getTokenByMultichainId(multichainId: string): TBridgeToken<N> | undefined
  getTransactionData(transaction: TTransactionBase): TNeo3NeoXBridgeTransactionData<N> | undefined
}

export interface IBSWithNeo3NeoXBridge<N extends TBSBridgeName> {
  neo3NeoXBridgeService: INeo3NeoXBridgeService<N>
}

// Token Service

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
  validateTokenHash(hash?: string): hash is string
  isNativeToken(hash: string): boolean
}

// WalletConnect

export type TWalletConnectServiceRequestMethodParams<N extends string> = {
  account: TBSAccount<N>
  params: any
}

export type TWalletConnectServiceRequestMethod<N extends string> = (
  params: TWalletConnectServiceRequestMethodParams<N>
) => Promise<any>

export interface IWalletConnectService<N extends string> {
  readonly namespace: string
  readonly chain: string
  readonly supportedMethods: string[]
  readonly supportedEvents: string[]
  readonly calculableMethods: string[]
  readonly autoApproveMethods: string[]

  calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string>

  [methodName: string]: any | TWalletConnectServiceRequestMethod<N>
}

export interface IBSWithWalletConnect<N extends string> {
  walletConnectService: IWalletConnectService<N>
}
