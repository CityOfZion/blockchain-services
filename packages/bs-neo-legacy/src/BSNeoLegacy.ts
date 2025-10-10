import {
  TBSAccount,
  TBSToken,
  TTransferParam,
  TGetLedgerTransport,
  ITokenService,
  TBSNetwork,
  IClaimDataService,
  IBlockchainDataService,
  IExchangeDataService,
  IExplorerService,
  BSUtilsHelper,
  BSKeychainHelper,
  TPingNetworkResponse,
} from '@cityofzion/blockchain-service'
import { BSNeoLegacyConstants } from './constants/BSNeoLegacyConstants'
import { CryptoCompareEDSNeoLegacy } from './services/exchange-data/CryptoCompareEDSNeoLegacy'
import { DoraBDSNeoLegacy } from './services/blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from './services/explorer/NeoTubeESNeoLegacy'
import { NeonJsLedgerServiceNeoLegacy } from './services/ledger/NeonJsLedgerServiceNeoLegacy'
import { TokenServiceNeoLegacy } from './services/token/TokenServiceNeoLegacy'
import { IBSNeoLegacy, TBSNeoLegacyNetworkId, TSigningCallback } from './types'
import { DoraCDSNeoLegacy } from './services/claim-data/DoraCDSNeoLegacy'
import { Neo3NeoLegacyMigrationService } from './services/migration/Neo3NeoLegacyMigrationService'
import { BSNeoLegacyNeonJsSingletonHelper } from './helpers/BSNeoLegacyNeonJsSingletonHelper'
import axios from 'axios'
export class BSNeoLegacy<N extends string = string> implements IBSNeoLegacy<N> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = false

  readonly tokens!: TBSToken[]
  readonly nativeTokens!: TBSToken[]
  readonly feeToken!: TBSToken
  readonly claimToken!: TBSToken
  readonly burnToken!: TBSToken

  network!: TBSNetwork<TBSNeoLegacyNetworkId>
  availableNetworkURLs!: string[]
  legacyNetwork!: string
  readonly defaultNetwork: TBSNetwork<TBSNeoLegacyNetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeoLegacyNetworkId>[]

  blockchainDataService!: IBlockchainDataService
  exchangeDataService!: IExchangeDataService
  ledgerService: NeonJsLedgerServiceNeoLegacy<N>
  explorerService!: IExplorerService
  tokenService!: ITokenService
  claimDataService!: IClaimDataService
  neo3NeoLegacyMigrationService!: Neo3NeoLegacyMigrationService<N>

  constructor(name: N, network?: TBSNetwork<TBSNeoLegacyNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new NeonJsLedgerServiceNeoLegacy(this, getLedgerTransport)
    this.bip44DerivationPath = BSNeoLegacyConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.nativeTokens = BSNeoLegacyConstants.NATIVE_ASSETS
    this.feeToken = BSNeoLegacyConstants.GAS_ASSET
    this.burnToken = BSNeoLegacyConstants.NEO_ASSET
    this.claimToken = BSNeoLegacyConstants.GAS_ASSET
    this.tokens = this.nativeTokens

    this.availableNetworks = BSNeoLegacyConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoLegacyConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
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
    const { api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()
    config = await api.createClaimTx(config)
    config = await api.addAttributeIfExecutingAsSmartContract(config)
    config = await api.signTx(config)
    config = await api.addSignatureIfExecutingAsSmartContract(config)

    return config
  }

  async #sendClaim(config: any) {
    const { api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()
    const sharedConfig = await api.fillClaims(config)
    let signedConfig = await this.#signClaim({ ...sharedConfig })

    if (this.#hasTransactionMoreThanMaxSize(signedConfig)) {
      signedConfig = await this.#signClaim(this.#getRequiredTransactionFeeConfig(sharedConfig))
    }

    signedConfig = await api.sendTx(signedConfig)

    return signedConfig.response.txid
  }

  async #signTransfer(config: any, nep5ScriptBuilder?: any) {
    const { api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

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
    const { api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const sharedConfig = await api.fillBalance(config)
    let signedConfig = await this.#signTransfer({ ...sharedConfig }, nep5ScriptBuilder)

    if (this.#hasTransactionMoreThanMaxSize(signedConfig)) {
      signedConfig = await this.#signTransfer(this.#getRequiredTransactionFeeConfig(sharedConfig), nep5ScriptBuilder)
    }

    signedConfig = await api.sendTx(signedConfig)

    return signedConfig.response.txid
  }

  async generateSigningCallback(
    account: TBSAccount<N>
  ): Promise<{ neonJsAccount: any; signingCallback: TSigningCallback }> {
    const { wallet, api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

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

  setNetwork(network: TBSNetwork<TBSNeoLegacyNetworkId>) {
    const availableURLs = BSNeoLegacyConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []

    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, availableURLs)
    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    this.availableNetworkURLs = availableURLs

    this.tokenService = new TokenServiceNeoLegacy()
    this.explorerService = new NeoTubeESNeoLegacy(this)
    this.blockchainDataService = new DoraBDSNeoLegacy(this)
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(this)
    this.claimDataService = new DoraCDSNeoLegacy(this)
    this.neo3NeoLegacyMigrationService = new Neo3NeoLegacyMigrationService(this)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNode(url: string): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()

    const response = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        method: 'getblockcount',
        params: [],
        id: 1234,
      },
      { timeout: 5000, signal: abortController.signal }
    )

    clearTimeout(timeout)

    const latency = Date.now() - timeStart

    return {
      latency,
      url,
      height: response.data.result,
    }
  }

  validateAddress(address: string): boolean {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()
    return wallet.isAddress(address)
  }

  validateEncrypted(key: string): boolean {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()
    return wallet.isNEP2(key)
  }

  validateKey(key: string): boolean {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()
    return wallet.isWIF(key) || wallet.isPrivateKey(key)
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): TBSAccount<N> {
    const mnemonicStr = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const key = BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(mnemonicStr, bip44Path)

    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const { address, WIF } = new wallet.Account(key)
    return { address, key: WIF, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromKey(key: string): TBSAccount<N> {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    if (!wallet.isPublicKey(publicKey)) throw new Error('Invalid public key')

    const account = new wallet.Account(publicKey)

    return {
      address: account.address,
      key: account.publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<N>> {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  encrypt(key: string, password: string): Promise<string> {
    const { wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    return wallet.encrypt(key, password)
  }

  async transfer({ intents, senderAccount, tipIntent, ...params }: TTransferParam<N>): Promise<string[]> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(senderAccount)

    const { api, sc, u, wallet } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

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

  async claim(account: TBSAccount<N>): Promise<string> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(account)

    const { api } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const apiProvider = new api.neoCli.instance(this.legacyNetwork)

    return await this.#sendClaim({
      api: apiProvider,
      account: neonJsAccount,
      url: this.network.url,
      signingFunction: signingCallback,
    })
  }
}
