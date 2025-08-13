import {
  Account,
  BDSClaimable,
  BlockchainDataService,
  BlockchainService,
  BSClaimable,
  ExchangeDataService,
  Token,
  Network,
  TransferParam,
  BSWithExplorerService,
  ExplorerService,
  BSWithLedger,
  GetLedgerTransport,
  BalanceResponse,
  BSTokenHelper,
  BSBigNumberHelper,
} from '@cityofzion/blockchain-service'
import { api, sc, tx, u, wallet } from '@cityofzion/neon-js'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from './exchange-data/CryptoCompareEDSNeoLegacy'
import { DoraBDSNeoLegacy } from './blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from './explorer/NeoTubeESNeoLegacy'
import { NeonJsLedgerServiceNeoLegacy } from './ledger/NeonJsLedgerServiceNeoLegacy'

export type MigrateParams<BSName extends string = string> = {
  account: Account<BSName>
  neo3Address: string
  neoLegacyMigrationAmounts: CalculateNeoLegacyMigrationAmountsResponse
}

export type CalculateNeo3MigrationAmountsResponse = {
  gasMigrationTotalFees?: string
  neoMigrationTotalFees?: string
  gasMigrationReceiveAmount?: string
  neoMigrationReceiveAmount?: string
}

export type CalculateNeoLegacyMigrationAmountsResponse = {
  hasEnoughGasBalance: boolean
  hasEnoughNeoBalance: boolean
  gasBalance?: BalanceResponse
  neoBalance?: BalanceResponse
}

export class BSNeoLegacy<BSName extends string = string>
  implements
    BlockchainService<BSName, BSNeoLegacyNetworkId>,
    BSClaimable<BSName>,
    BSWithExplorerService,
    BSWithLedger<BSName>
{
  NATIVE_ASSETS = BSNeoLegacyConstants.NATIVE_ASSETS

  readonly name: BSName
  readonly bip44DerivationPath: string

  nativeTokens!: Token[]

  feeToken!: Token
  claimToken!: Token
  burnToken!: Token

  blockchainDataService!: BlockchainDataService & BDSClaimable
  exchangeDataService!: ExchangeDataService
  ledgerService: NeonJsLedgerServiceNeoLegacy<BSName>
  explorerService!: ExplorerService
  tokens!: Token[]
  network!: Network<BSNeoLegacyNetworkId>
  legacyNetwork: string

  constructor(name: BSName, network?: Network<BSNeoLegacyNetworkId>, getLedgerTransport?: GetLedgerTransport<BSName>) {
    network = network ?? BSNeoLegacyConstants.DEFAULT_NETWORK

    this.name = name
    this.legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    this.ledgerService = new NeonJsLedgerServiceNeoLegacy(this, getLedgerTransport)
    this.bip44DerivationPath = BSNeoLegacyConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.setNetwork(network)
  }

  async #generateSigningCallback(account: Account<BSName>) {
    const neonJsAccount = new wallet.Account(account.key)

    if (account.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide a getLedgerTransport function to use Ledger')

      if (typeof account.bip44Path !== 'string') throw new Error('Your account must have bip44 path to use Ledger')

      const ledgerTransport = await this.ledgerService.getLedgerTransport(account)

      return {
        neonJsAccount,
        signingCallback: this.ledgerService.getSigningCallback(ledgerTransport, account),
      }
    }

    return {
      neonJsAccount,
      signingCallback: api.signWithPrivateKey(neonJsAccount.privateKey),
    }
  }

  #setTokens(network: Network<BSNeoLegacyNetworkId>) {
    const tokens = BSNeoLegacyHelper.getTokens(network)

    this.nativeTokens = BSNeoLegacyConstants.NATIVE_ASSETS
    this.tokens = tokens
    this.feeToken = tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = tokens.find(token => token.symbol === 'NEO')!
    this.claimToken = tokens.find(token => token.symbol === 'GAS')!
  }

  #hasTransactionMoreThanMaxSize(config: any) {
    if (!config.fees || config.fees < BSNeoLegacyConstants.FEE_APPLIED_TO_PLAYABLE_TRANSACTION) {
      const serializedTransaction = config.tx.serialize(true)
      const transactionSize = serializedTransaction.length / 2

      if (transactionSize > BSNeoLegacyConstants.MAX_TRANSACTION_SIZE_WITHOUT_FEE) {
        return true
      }
    }

    return false
  }

  #getRequiredTransactionFeeConfig(config: any) {
    config.fees = BSNeoLegacyConstants.FEE_APPLIED_TO_PLAYABLE_TRANSACTION

    const gasIntent = config.intents
      ?.filter((intent: any) => BSTokenHelper.normalizeHash(intent.assetId) === BSNeoLegacyConstants.GAS_ASSET.hash)
      ?.sort((a: any, b: any) => b.value.comparedTo(a.value) ?? 0)?.[0]

    if (gasIntent?.value) {
      gasIntent.value = gasIntent.value.sub(BSNeoLegacyConstants.FEE_APPLIED_TO_PLAYABLE_TRANSACTION)
    }

    return config
  }

  async #signTransfer(config: any, nep5ScriptBuilder?: any) {
    if (!nep5ScriptBuilder || nep5ScriptBuilder.isEmpty()) {
      config = await api.createContractTx(config)
    } else {
      config.script = nep5ScriptBuilder.str
      config = await api.createInvocationTx(config)
    }
    config = await api.modifyTransactionForEmptyTransaction(config)
    config = await api.addAttributeIfExecutingAsSmartContract(config)
    config = await api.signTx(config)
    config = await api.addSignatureIfExecutingAsSmartContract(config)

    return config
  }

  async #sendTransfer(config: any, nep5ScriptBuilder?: any) {
    const sharedConfig = await api.fillBalance(config)
    let signedConfig = await this.#signTransfer({ ...sharedConfig }, nep5ScriptBuilder)

    if (this.#hasTransactionMoreThanMaxSize(signedConfig)) {
      signedConfig = await this.#signTransfer(this.#getRequiredTransactionFeeConfig(sharedConfig), nep5ScriptBuilder)
    }

    signedConfig = await api.sendTx(signedConfig)

    return signedConfig.response.txid
  }

  async #signClaim(config: any) {
    config = await api.createClaimTx(config)
    config = await api.addAttributeIfExecutingAsSmartContract(config)
    config = await api.signTx(config)
    config = await api.addSignatureIfExecutingAsSmartContract(config)

    return config
  }

  async #sendClaim(config: any) {
    const sharedConfig = await api.fillClaims(config)
    let signedConfig = await this.#signClaim({ ...sharedConfig })

    if (this.#hasTransactionMoreThanMaxSize(signedConfig)) {
      signedConfig = await this.#signClaim(this.#getRequiredTransactionFeeConfig(sharedConfig))
    }

    signedConfig = await api.sendTx(signedConfig)

    return signedConfig.response.txid
  }

  async testNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const blockchainDataServiceClone = new DoraBDSNeoLegacy(
      network,
      this.feeToken,
      this.claimToken,
      this.tokens,
      this.explorerService
    )

    await blockchainDataServiceClone.getBlockHeight()
  }

  setNetwork(network: Network<BSNeoLegacyNetworkId>) {
    if (!BSNeoLegacyConstants.ALL_NETWORK_IDS.includes(network.id)) throw new Error('Custom network is not supported')

    this.#setTokens(network)

    this.network = network
    this.explorerService = new NeoTubeESNeoLegacy(network)
    this.blockchainDataService = new DoraBDSNeoLegacy(
      network,
      this.feeToken,
      this.claimToken,
      this.tokens,
      this.explorerService
    )
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(network)
  }

  validateAddress(address: string): boolean {
    return wallet.isAddress(address)
  }

  validateEncrypted(key: string): boolean {
    return wallet.isNEP2(key)
  }

  validateKey(key: string): boolean {
    return wallet.isWIF(key) || wallet.isPrivateKey(key)
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Account<BSName> {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', bip44Path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromKey(key: string): Account<BSName> {
    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  generateAccountFromPublicKey(publicKey: string): Account<BSName> {
    if (!wallet.isPublicKey(publicKey)) throw new Error('Invalid public key')

    const account = new wallet.Account(publicKey)

    return {
      address: account.address,
      key: account.publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async decrypt(encryptedKey: string, password: string): Promise<Account<BSName>> {
    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  encrypt(key: string, password: string): Promise<string> {
    return wallet.encrypt(key, password)
  }

  async transfer({ intents, senderAccount, tipIntent, ...params }: TransferParam<BSName>): Promise<string[]> {
    const { neonJsAccount, signingCallback } = await this.#generateSigningCallback(senderAccount)
    const apiProvider = new api.neoCli.instance(this.network.url)
    const priorityFee = Number(params.priorityFee ?? 0)

    const nativeIntents: ReturnType<typeof api.makeIntent> = []
    const nep5ScriptBuilder = new sc.ScriptBuilder()

    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    for (const intent of concatIntents) {
      const normalizeTokenHash = BSTokenHelper.normalizeHash(intent.tokenHash)

      const nativeAsset = this.NATIVE_ASSETS.find(BSTokenHelper.predicateByHash(normalizeTokenHash))

      if (nativeAsset) {
        nativeIntents.push(...api.makeIntent({ [nativeAsset.symbol]: Number(intent.amount) }, intent.receiverAddress))
        continue
      }

      nep5ScriptBuilder.emitAppCall(normalizeTokenHash, 'transfer', [
        u.reverseHex(wallet.getScriptHashFromAddress(neonJsAccount.address)),
        u.reverseHex(wallet.getScriptHashFromAddress(intent.receiverAddress)),
        sc.ContractParam.integer(
          new u.Fixed8(intent.amount)
            .div(Math.pow(10, 8 - (intent.tokenDecimals ?? 8)))
            .toRawNumber()
            .toString()
        ),
      ])
    }

    const hash = await this.#sendTransfer(
      {
        account: neonJsAccount,
        api: apiProvider,
        url: this.network.url,
        intents: nativeIntents.length > 0 ? nativeIntents : undefined,
        signingFunction: signingCallback,
        fees: priorityFee,
      },
      nep5ScriptBuilder
    )

    return intents.map(() => hash)
  }

  async claim(account: Account<BSName>): Promise<string> {
    const { neonJsAccount, signingCallback } = await this.#generateSigningCallback(account)

    const apiProvider = new api.neoCli.instance(this.legacyNetwork)

    return await this.#sendClaim({
      api: apiProvider,
      account: neonJsAccount,
      url: this.network.url,
      signingFunction: signingCallback,
    })
  }

  async migrate({ account, neo3Address, neoLegacyMigrationAmounts }: MigrateParams<BSName>): Promise<string> {
    if (!BSNeoLegacyHelper.isMainnet(this.network)) {
      throw new Error('Must use Mainnet network')
    }

    if (
      (!neoLegacyMigrationAmounts.hasEnoughGasBalance && !neoLegacyMigrationAmounts.hasEnoughNeoBalance) ||
      (!neoLegacyMigrationAmounts.gasBalance && !neoLegacyMigrationAmounts.neoBalance)
    ) {
      throw new Error('Must have at least 0.1 GAS or 2 NEO')
    }

    const { neonJsAccount, signingCallback } = await this.#generateSigningCallback(account)
    const provider = new api.neoCli.instance(this.network.url)
    const intents: ReturnType<typeof api.makeIntent> = []

    if (neoLegacyMigrationAmounts.hasEnoughGasBalance && neoLegacyMigrationAmounts.gasBalance)
      intents.push(
        ...api.makeIntent(
          { [BSNeoLegacyConstants.GAS_ASSET.symbol]: Number(neoLegacyMigrationAmounts.gasBalance.amount) },
          BSNeoLegacyConstants.MIGRATION_COZ_LEGACY_ADDRESS
        )
      )

    if (neoLegacyMigrationAmounts.hasEnoughNeoBalance && neoLegacyMigrationAmounts.neoBalance)
      intents.push(
        ...api.makeIntent(
          { [BSNeoLegacyConstants.NEO_ASSET.symbol]: Number(neoLegacyMigrationAmounts.neoBalance.amount) },
          BSNeoLegacyConstants.MIGRATION_COZ_LEGACY_ADDRESS
        )
      )

    return await this.#sendTransfer({
      url: this.network.url,
      api: provider,
      account: neonJsAccount,
      intents,
      signingFunction: signingCallback,
      override: {
        attributes: [
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark14,
            data: u.str2hexstring(neo3Address),
          }),
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark15,
            data: u.str2hexstring('Neon Desktop Migration'),
          }),
        ],
      },
    })
  }

  /**
   * Reference: https://github.com/CityOfZion/legacy-n3-swap-service/blob/master/policy/policy.go
   */
  calculateNeo3MigrationAmounts(
    neoLegacyMigrationAmounts: CalculateNeoLegacyMigrationAmountsResponse
  ): CalculateNeo3MigrationAmountsResponse {
    const response: CalculateNeo3MigrationAmountsResponse = {
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    }

    if (neoLegacyMigrationAmounts.gasBalance && neoLegacyMigrationAmounts.hasEnoughGasBalance) {
      // Two transfers fee and one transfer fee left over
      const allNep17TransfersFee = BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE * 3
      const gasMigrationAmountNumber = Number(neoLegacyMigrationAmounts.gasBalance.amount)

      // Necessary to calculate the COZ fee
      const gasAmountNumberLessAllNep17TransfersFee = gasMigrationAmountNumber - allNep17TransfersFee

      // Example: ~0.06635710 * 0.01 = ~0.00066357
      const cozFee = gasAmountNumberLessAllNep17TransfersFee * BSNeoLegacyConstants.MIGRATION_COZ_FEE

      // Example: ~0.06635710 - ~0.00066357 = ~0.06569352
      const gasAmountNumberLessCozFee = gasAmountNumberLessAllNep17TransfersFee - cozFee

      const allGasFeeNumberThatUserWillPay = cozFee + BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE * 2
      const allGasAmountNumberThatUserWillReceive =
        gasAmountNumberLessCozFee + BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE

      response.gasMigrationTotalFees = BSBigNumberHelper.format(allGasFeeNumberThatUserWillPay, {
        decimals: BSNeoLegacyConstants.GAS_ASSET.decimals,
      })

      response.gasMigrationReceiveAmount = BSBigNumberHelper.format(allGasAmountNumberThatUserWillReceive, {
        decimals: BSNeoLegacyConstants.GAS_ASSET.decimals,
      })
    }

    if (neoLegacyMigrationAmounts.neoBalance && neoLegacyMigrationAmounts.hasEnoughNeoBalance) {
      const neoMigrationAmountNumber = Number(neoLegacyMigrationAmounts.neoBalance.amount)

      response.neoMigrationTotalFees = BSBigNumberHelper.format(
        Math.ceil(neoMigrationAmountNumber * BSNeoLegacyConstants.MIGRATION_COZ_FEE),
        { decimals: BSNeoLegacyConstants.NEO_ASSET.decimals }
      )

      response.neoMigrationReceiveAmount = BSBigNumberHelper.format(
        neoMigrationAmountNumber - Number(response.neoMigrationTotalFees),
        { decimals: BSNeoLegacyConstants.NEO_ASSET.decimals }
      )
    }

    return response
  }

  calculateNeoLegacyMigrationAmounts(balance: BalanceResponse[]): CalculateNeoLegacyMigrationAmountsResponse {
    const gasBalance = balance.find(({ token }) => BSTokenHelper.predicateByHash(BSNeoLegacyConstants.GAS_ASSET)(token))
    const neoBalance = balance.find(({ token }) => BSTokenHelper.predicateByHash(BSNeoLegacyConstants.NEO_ASSET)(token))

    let hasEnoughGasBalance = false
    let hasEnoughNeoBalance = false

    if (gasBalance) {
      const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)
      hasEnoughGasBalance = gasBalanceNumber.isGreaterThanOrEqualTo(BSNeoLegacyConstants.MIGRATION_MIN_GAS)
    }

    if (neoBalance) {
      const neoBalanceNumber = BSBigNumberHelper.fromNumber(neoBalance.amount)
      hasEnoughNeoBalance = neoBalanceNumber.isGreaterThanOrEqualTo(BSNeoLegacyConstants.MIGRATION_MIN_NEO)
    }

    return {
      gasBalance,
      neoBalance,
      hasEnoughGasBalance,
      hasEnoughNeoBalance,
    }
  }
}
