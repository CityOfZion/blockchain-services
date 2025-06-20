import Transport from '@ledgerhq/hw-transport'
import TypedEmitter from 'typed-emitter'

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
  tokens: Token[]
  nativeTokens: Token[]
  network: Network<BSAvailableNetworks>
  testNetwork: (network: Network<BSAvailableNetworks>) => Promise<void>
  setNetwork: (partialNetwork: Network<BSAvailableNetworks>) => void
  generateAccountFromMnemonic(mnemonic: string, index: number): Account<BSName>
  generateAccountFromKey(key: string): Account<BSName>
  decrypt(keyOrJson: string, password: string): Promise<Account<BSName>>
  encrypt(key: string, password: string): Promise<string>
  validateAddress(address: string): boolean
  validateEncrypted(keyOrJson: string): boolean
  validateKey(key: string): boolean
  transfer(param: TransferParam<BSName>): Promise<string[]>
}

export interface BSCalculableFee<BSName extends string = string> {
  calculateTransferFee(param: TransferParam<BSName>, details?: boolean): Promise<string>
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

export interface IBSWithNeo3NeoXBridge<BSName extends string = string> {
  neo3NeoXBridgeService: INeo3NeoXBridgeService<BSName>
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
  hash: string
  hashUrl?: string
  to?: string
  toUrl?: string
  from?: string
  fromUrl?: string
  tokenType: 'generic' | (string & NonNullable<unknown>)
  tokenId?: string
  nftImageUrl?: string
  nftUrl?: string
  name?: string
  collectionName?: string
}

export type FullTransactionAssetEvent = {
  eventType: 'token'
  amount?: string
  methodName: string
  hash: string
  hashUrl?: string
  to?: string
  toUrl?: string
  from?: string
  fromUrl?: string
  token?: Token
  tokenType: 'generic' | (string & NonNullable<unknown>)
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
}

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

export type SwapServiceToken<BSName extends string = string> = {
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

export type SwapServiceLoadableValue<T> = { loading: boolean; value: T | null }
export type SwapServiceValidateValue<T> = SwapServiceLoadableValue<T> & { valid: boolean | null }

export type SwapServiceMinMaxAmount = {
  min: string
  max: string | null
}

export type SwapServiceEvents<BSName extends string = string> = {
  accountToUse: (account: SwapServiceValidateValue<Account<BSName>>) => void | Promise<void>
  amountToUse: (amount: SwapServiceLoadableValue<string>) => void | Promise<void>
  amountToUseMinMax: (minMax: SwapServiceLoadableValue<SwapServiceMinMaxAmount>) => void | Promise<void>
  tokenToUse: (token: SwapServiceLoadableValue<SwapServiceToken<BSName>>) => void | Promise<void>
  availableTokensToUse: (tokens: SwapServiceLoadableValue<SwapServiceToken<BSName>[]>) => void | Promise<void>
  addressToReceive: (account: SwapServiceValidateValue<string>) => void | Promise<void>
  extraIdToReceive: (extraIdToReceive: SwapServiceValidateValue<string>) => void
  amountToReceive: (amount: SwapServiceLoadableValue<string>) => void | Promise<void>
  tokenToReceive: (token: SwapServiceLoadableValue<SwapServiceToken<BSName>>) => void | Promise<void>
  availableTokensToReceive: (tokens: SwapServiceLoadableValue<SwapServiceToken<BSName>[]>) => void | Promise<void>
  error: (error: string) => void | Promise<void>
}

export type SwapServiceSwapResult = {
  id: string
  txFrom?: string
  log?: string
}

export type SwapServiceStatusResponse = {
  status: 'finished' | 'confirming' | 'exchanging' | 'failed' | 'refunded'
  txFrom?: string
  txTo?: string
  log?: string
}

export interface SwapServiceHelper {
  getStatus(id: string): Promise<SwapServiceStatusResponse>
}

export interface SwapService<BSName extends string = string> {
  eventEmitter: TypedEmitter<SwapServiceEvents<BSName>>

  setTokenToUse(token: SwapServiceToken<BSName> | null): Promise<void>
  setAccountToUse(account: Account<BSName> | null): Promise<void>
  setAmountToUse(amount: string | null): Promise<void>
  setTokenToReceive(token: SwapServiceToken<BSName> | null): Promise<void>
  setAddressToReceive(address: string | null): Promise<void>
  setExtraIdToReceive(extraId: string | null): Promise<void>
  swap(): Promise<SwapServiceSwapResult>
  calculateFee(): Promise<string>
}

export type TNeo3NeoXBridgeServiceCalculateMaxAmountParams<BSName extends string> = {
  account: Account<BSName>
  receiverAddress: string
  token: Token
  balances: BalanceResponse[]
}

export type TNeo3NeoXBridgeServiceValidatedInputs = {
  amount: string
  receiveAmount: string
  token: Token
}

export type TNeo3NeoXBridgeServiceBridgeParam<BSName extends string> = {
  account: Account<BSName>
  receiverAddress: string
  validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs
}

export type TNeo3NeoXBridgeServiceValidateInputParams<BSName extends string> = {
  account: Account<BSName>
  receiverAddress: string
  amount: string
  token: Token
  balances: BalanceResponse[]
}

export type TNeo3NeoXBridgeServiceWaitParams = {
  transactionHash: string
  validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs
}

export interface INeo3NeoXBridgeService<BSName extends string = string> {
  calculateMaxAmount(params: TNeo3NeoXBridgeServiceCalculateMaxAmountParams<BSName>): Promise<string>
  calculateFee(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string>
  bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string>
  validateInputs(
    params: TNeo3NeoXBridgeServiceValidateInputParams<BSName>
  ): Promise<TNeo3NeoXBridgeServiceValidatedInputs>
  wait(params: TNeo3NeoXBridgeServiceWaitParams): Promise<boolean>
}
