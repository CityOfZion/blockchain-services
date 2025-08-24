import {
  Account,
  Token,
  TransferParam,
  GetLedgerTransport,
  ITokenService,
  TNetwork,
  IClaimDataService,
  IBlockchainDataService,
  IExchangeDataService,
  IExplorerService,
} from '@cityofzion/blockchain-service'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { BSNeoLegacyConstants } from './constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from './helpers/BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from './services/exchange-data/CryptoCompareEDSNeoLegacy'
import { DoraBDSNeoLegacy } from './services/blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from './services/explorer/NeoTubeESNeoLegacy'
import { NeonJsLedgerServiceNeoLegacy } from './services/ledger/NeonJsLedgerServiceNeoLegacy'
import { TokenServiceNeoLegacy } from './services/token/TokenServiceNeoLegacy'
import { IBSNeoLegacy, TBSNeoLegacyNetworkId, TSigningCallback } from './types'
import { DoraCDSNeoLegacy } from './services/claim-data/DoraCDSNeoLegacy'
import { Neo3NeoLegacyMigrationService } from './services/migration/Neo3NeoLegacyMigrationService'

export class BSNeoLegacy<N extends string = string> implements IBSNeoLegacy<N> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = false

  tokens!: Token[]
  readonly nativeTokens!: Token[]
  readonly feeToken!: Token
  readonly claimToken!: Token
  readonly burnToken!: Token

  network!: TNetwork<TBSNeoLegacyNetworkId>
  legacyNetwork!: string
  readonly defaultNetwork: TNetwork<TBSNeoLegacyNetworkId>
  readonly availableNetworks: TNetwork<TBSNeoLegacyNetworkId>[]

  blockchainDataService!: IBlockchainDataService
  exchangeDataService!: IExchangeDataService
  ledgerService: NeonJsLedgerServiceNeoLegacy<N>
  explorerService!: IExplorerService
  tokenService!: ITokenService
  claimDataService!: IClaimDataService
  neo3NeoLegacyMigrationService!: Neo3NeoLegacyMigrationService<N>

  constructor(name: N, network?: TNetwork<TBSNeoLegacyNetworkId>, getLedgerTransport?: GetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new NeonJsLedgerServiceNeoLegacy(this, getLedgerTransport)
    this.bip44DerivationPath = BSNeoLegacyConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.nativeTokens = BSNeoLegacyConstants.NATIVE_ASSETS
    this.feeToken = BSNeoLegacyConstants.GAS_ASSET
    this.burnToken = BSNeoLegacyConstants.NEO_ASSET
    this.claimToken = BSNeoLegacyConstants.GAS_ASSET

    this.availableNetworks = BSNeoLegacyConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoLegacyConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  #setTokens(network: TNetwork<TBSNeoLegacyNetworkId>) {
    const tokens = BSNeoLegacyHelper.getTokens(network)
    this.tokens = tokens
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
      ?.filter((intent: any) => this.tokenService.normalizeHash(intent.assetId) === BSNeoLegacyConstants.GAS_ASSET.hash)
      ?.sort((a: any, b: any) => b.value.comparedTo(a.value) ?? 0)?.[0]

    if (gasIntent?.value) {
      gasIntent.value = gasIntent.value.sub(BSNeoLegacyConstants.FEE_APPLIED_TO_PLAYABLE_TRANSACTION)
    }

    return config
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

  async sendTransfer(config: any, nep5ScriptBuilder?: any) {
    const sharedConfig = await api.fillBalance(config)
    let signedConfig = await this.#signTransfer({ ...sharedConfig }, nep5ScriptBuilder)

    if (this.#hasTransactionMoreThanMaxSize(signedConfig)) {
      signedConfig = await this.#signTransfer(this.#getRequiredTransactionFeeConfig(sharedConfig), nep5ScriptBuilder)
    }

    signedConfig = await api.sendTx(signedConfig)

    return signedConfig.response.txid
  }

  async generateSigningCallback(
    account: Account<N>
  ): Promise<{ neonJsAccount: any; signingCallback: TSigningCallback }> {
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

  async testNetwork(network: TNetwork<TBSNeoLegacyNetworkId>) {
    const service = new BSNeoLegacy(this.name, network, this.ledgerService.getLedgerTransport)
    const blockchainDataServiceClone = new DoraBDSNeoLegacy(service)

    await blockchainDataServiceClone.getBlockHeight()
  }

  setNetwork(network: TNetwork<TBSNeoLegacyNetworkId>) {
    this.#setTokens(network)

    this.network = network
    this.legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]

    this.tokenService = new TokenServiceNeoLegacy()
    this.explorerService = new NeoTubeESNeoLegacy(this)
    this.blockchainDataService = new DoraBDSNeoLegacy(this)
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(this)
    this.claimDataService = new DoraCDSNeoLegacy(this)
    this.neo3NeoLegacyMigrationService = new Neo3NeoLegacyMigrationService(this)
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

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Account<N> {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', bip44Path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromKey(key: string): Account<N> {
    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  generateAccountFromPublicKey(publicKey: string): Account<N> {
    if (!wallet.isPublicKey(publicKey)) throw new Error('Invalid public key')

    const account = new wallet.Account(publicKey)

    return {
      address: account.address,
      key: account.publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async decrypt(encryptedKey: string, password: string): Promise<Account<N>> {
    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  encrypt(key: string, password: string): Promise<string> {
    return wallet.encrypt(key, password)
  }

  async transfer({ intents, senderAccount, tipIntent, ...params }: TransferParam<N>): Promise<string[]> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(senderAccount)
    const apiProvider = new api.neoCli.instance(this.network.url)
    const priorityFee = Number(params.priorityFee ?? 0)

    const nativeIntents: ReturnType<typeof api.makeIntent> = []
    const nep5ScriptBuilder = new sc.ScriptBuilder()

    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    for (const intent of concatIntents) {
      const normalizeTokenHash = this.tokenService.normalizeHash(intent.tokenHash)

      const nativeAsset = this.nativeTokens.find(token => this.tokenService.predicateByHash(normalizeTokenHash, token))

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

    const hash = await this.sendTransfer(
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

  async claim(account: Account<N>): Promise<string> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(account)

    const apiProvider = new api.neoCli.instance(this.legacyNetwork)

    return await this.#sendClaim({
      api: apiProvider,
      account: neonJsAccount,
      url: this.network.url,
      signingFunction: signingCallback,
    })
  }
}
