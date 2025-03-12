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
  BSMigrationNeo3,
  MigrateToNeo3Params,
  normalizeHash,
  CalculateToMigrateToNeo3ValuesResponse,
  CalculateToMigrateToNeo3ValuesParams,
  formatNumber,
} from '@cityofzion/blockchain-service'
import { api, sc, tx, u, wallet } from '@cityofzion/neon-js'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from './exchange-data/CryptoCompareEDSNeoLegacy'
import { DoraBDSNeoLegacy } from './blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from './explorer/NeoTubeESNeoLegacy'
import { NeonJsLedgerServiceNeoLegacy } from './ledger/NeonJsLedgerServiceNeoLegacy'

type GetMigrationNeo3ValidatedDataParams<BSName extends string = string> = {
  account: Account<BSName>
}

export class BSNeoLegacy<BSName extends string = string>
  implements
    BlockchainService<BSName, BSNeoLegacyNetworkId>,
    BSClaimable<BSName>,
    BSWithExplorerService,
    BSWithLedger<BSName>,
    BSMigrationNeo3<BSName>
{
  private readonly NATIVE_ASSETS = BSNeoLegacyConstants.NATIVE_ASSETS.map(asset => ({
    ...asset,
    hash: normalizeHash(asset.hash),
  }))!

  private readonly GAS_ASSET = this.NATIVE_ASSETS.find(({ symbol }) => symbol === 'GAS')!
  private readonly NEO_ASSET = this.NATIVE_ASSETS.find(({ symbol }) => symbol === 'NEO')!

  readonly name: BSName
  readonly bip44DerivationPath: string

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
    }
  }

  #setTokens(network: Network<BSNeoLegacyNetworkId>) {
    const tokens = BSNeoLegacyHelper.getTokens(network)

    this.tokens = tokens
    this.feeToken = tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = tokens.find(token => token.symbol === 'NEO')!
    this.claimToken = tokens.find(token => token.symbol === 'GAS')!
  }

  async testNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const blockchainDataServiceClone = new DoraBDSNeoLegacy(network, this.feeToken, this.claimToken, this.tokens)

    await blockchainDataServiceClone.getBlockHeight()
  }

  setNetwork(network: Network<BSNeoLegacyNetworkId>) {
    if (!BSNeoLegacyConstants.ALL_NETWORK_IDS.includes(network.id)) throw new Error('Custom network is not supported')

    this.#setTokens(network)

    this.network = network
    this.blockchainDataService = new DoraBDSNeoLegacy(network, this.feeToken, this.claimToken, this.tokens)
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(network)
    this.explorerService = new NeoTubeESNeoLegacy(network)
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
      const tokenHashFixed = BSNeoLegacyHelper.normalizeHash(intent.tokenHash)
      const nativeAsset = this.NATIVE_ASSETS.find(({ hash }) => hash === tokenHashFixed)

      if (nativeAsset) {
        nativeIntents.push(...api.makeIntent({ [nativeAsset.symbol]: Number(intent.amount) }, intent.receiverAddress))
        continue
      }

      nep5ScriptBuilder.emitAppCall(tokenHashFixed, 'transfer', [
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

    let response: any

    if (nep5ScriptBuilder.isEmpty()) {
      response = await api.sendAsset({
        account: neonJsAccount,
        api: apiProvider,
        url: this.network.url,
        intents: nativeIntents,
        fees: priorityFee,
        signingFunction: signingCallback,
      })
    } else {
      response = await api.doInvoke({
        intents: nativeIntents.length > 0 ? nativeIntents : undefined,
        account: neonJsAccount,
        api: apiProvider,
        script: nep5ScriptBuilder.str,
        url: this.network.url,
        fees: priorityFee,
        signingFunction: signingCallback,
      })
    }

    if (!response.tx) throw new Error('Failed to send transaction')

    return intents.map(() => response.tx!.hash)
  }

  async claim(account: Account): Promise<string> {
    const neoAccount = new wallet.Account(account.key)

    const balances = await this.blockchainDataService.getBalance(account.address)
    const neoBalance = balances.find(balance => balance.token.symbol === 'NEO')
    if (!neoBalance) throw new Error('It is necessary to have NEO to claim')

    const unclaimed = await this.blockchainDataService.getUnclaimed(account.address)
    if (Number(unclaimed) <= 0) throw new Error(`Doesn't have gas to claim`)

    const apiProvider = new api.neoCli.instance(this.legacyNetwork)
    const claims = await apiProvider.getClaims(account.address)

    const response = await api.claimGas({
      claims,
      api: apiProvider,
      account: neoAccount,
      url: this.network.url,
    })

    if (!response.tx) throw new Error('Failed to claim')
    return response.tx.hash
  }

  /**
   * Reference: https://github.com/CityOfZion/legacy-n3-swap-service/blob/master/policy/policy.go
   */
  async calculateToMigrateToNeo3Values(
    params: CalculateToMigrateToNeo3ValuesParams<BSName>
  ): Promise<CalculateToMigrateToNeo3ValuesResponse> {
    const { gasAmountNumber, neoAmountNumber } = await this.getMigrationNeo3ValidatedData(params)
    const response: CalculateToMigrateToNeo3ValuesResponse = {}

    if (gasAmountNumber) {
      // Two transfers fee and one transfer fee left over
      const allNep17TransfersFee = BSNeoLegacyConstants.MIGRATION_NEO3_NEP_17_TRANSFER_FEE * 3

      // Necessary to calculate the COZ fee
      const gasAmountNumberLessAllNep17TransfersFee = gasAmountNumber - allNep17TransfersFee

      // Example: ~0.06635710 * 0.01 = ~0.00066357
      const cozFee = gasAmountNumberLessAllNep17TransfersFee * BSNeoLegacyConstants.MIGRATION_NEO3_COZ_FEE

      // Example: ~0.06635710 - ~0.00066357 = ~0.06569352
      const gasAmountNumberLessCozFee = gasAmountNumberLessAllNep17TransfersFee - cozFee

      const allGasFeeNumberThatUserWillPay = cozFee + BSNeoLegacyConstants.MIGRATION_NEO3_NEP_17_TRANSFER_FEE * 2
      const allGasAmountNumberThatUserWillReceive =
        gasAmountNumberLessCozFee + BSNeoLegacyConstants.MIGRATION_NEO3_NEP_17_TRANSFER_FEE

      response.gasMigrationTotalFees = formatNumber(allGasFeeNumberThatUserWillPay, this.GAS_ASSET.decimals)
      response.gasMigrationAmount = formatNumber(allGasAmountNumberThatUserWillReceive, this.GAS_ASSET.decimals)
    }

    if (neoAmountNumber) {
      response.neoMigrationTotalFees = formatNumber(
        Math.ceil(neoAmountNumber * BSNeoLegacyConstants.MIGRATION_NEO3_COZ_FEE),
        this.NEO_ASSET.decimals
      )
      response.neoMigrationAmount = formatNumber(
        neoAmountNumber - Number(response.neoMigrationTotalFees),
        this.NEO_ASSET.decimals
      )
    }

    return response
  }

  async migrateToNeo3({ account, address }: MigrateToNeo3Params<BSName>): Promise<string> {
    if (!address) throw new Error('Must have address')

    const { gasAmountNumber, neoAmountNumber } = await this.getMigrationNeo3ValidatedData({ account })
    const { neonJsAccount, signingCallback } = await this.#generateSigningCallback(account)
    const provider = new api.neoCli.instance(this.network.url)
    const intents: ReturnType<typeof api.makeIntent> = []

    if (gasAmountNumber)
      intents.push(
        ...api.makeIntent({ [this.GAS_ASSET.symbol]: gasAmountNumber }, BSNeoLegacyConstants.MIGRATION_NEO3_COZ_ADDRESS)
      )

    if (neoAmountNumber)
      intents.push(
        ...api.makeIntent({ [this.NEO_ASSET.symbol]: neoAmountNumber }, BSNeoLegacyConstants.MIGRATION_NEO3_COZ_ADDRESS)
      )

    const response = await api.sendAsset({
      url: this.network.url,
      api: provider,
      account: neonJsAccount,
      intents,
      fees: 0,
      signingFunction: signingCallback,
      override: {
        attributes: [
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark14,
            data: u.str2hexstring(address),
          }),
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark15,
            data: u.str2hexstring('Neon Desktop Migration'),
          }),
        ],
      },
    })

    if (!response.tx) throw new Error('Migration failed on send')

    return response.tx!.hash
  }

  private async getMigrationNeo3ValidatedData({ account }: GetMigrationNeo3ValidatedDataParams<BSName>) {
    if (!BSNeoLegacyHelper.isMainnet(this.network)) throw new Error('Must use Mainnet network')

    const balances = await this.blockchainDataService.getBalance(account.address)

    const gasAmount = balances.find(({ token }) => normalizeHash(token.hash) === this.GAS_ASSET.hash)?.amount
    const neoAmount = balances.find(({ token }) => normalizeHash(token.hash) === this.NEO_ASSET.hash)?.amount

    let gasAmountNumber = Number(gasAmount) || 0
    let neoAmountNumber = Number(neoAmount) || 0

    const hasNotGasAmountEnough = gasAmountNumber < 0.1
    const hasNotNeoAmountEnough = neoAmountNumber < 2

    if (hasNotGasAmountEnough && hasNotNeoAmountEnough) throw new Error('Must have at least 0.1 GAS or 2 NEO')
    if (hasNotGasAmountEnough) gasAmountNumber = 0
    if (hasNotNeoAmountEnough) neoAmountNumber = 0

    return { gasAmountNumber, neoAmountNumber }
  }
}
