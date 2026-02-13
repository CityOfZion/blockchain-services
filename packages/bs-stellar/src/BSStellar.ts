import {
  type TBSToken,
  type TBSNetwork,
  type IExchangeDataService,
  type IBlockchainDataService,
  type ITokenService,
  type TPingNetworkResponse,
  type TBSAccount,
  type TTransferParam,
  BSUtilsHelper,
  BSKeychainHelper,
  BSBigNumberHelper,
  type IExplorerService,
  type TGetLedgerTransport,
  BSError,
  type TBSBigNumber,
  type IWalletConnectService,
} from '@cityofzion/blockchain-service'
import type { IBSStellar, TBSStellarNetworkId } from './types'
import { BSStellarConstants } from './constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'
import axios from 'axios'
import { TokenServiceStellar } from './services/token/TokenServiceStellar'
import { HorizonBDSStellar } from './services/blockchain-data/HorizonBDSStellar'
import { RpcEDSStellar } from './services/exchange/RpcEDSStellar'
import { StellarChainESStellar } from './services/explorer/StellarChainESStellar'
import { LedgerServiceStellar } from './services/ledger/LedgerServiceStellar'
import { WalletConnectServiceStellar } from './services/wallet-connect/WalletConnectServiceStellar'

export class BSStellar<N extends string = string> implements IBSStellar<N> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = false

  network!: TBSNetwork<TBSStellarNetworkId>
  rpcNetworkUrls!: string[]
  readonly defaultNetwork: TBSNetwork<TBSStellarNetworkId>
  readonly availableNetworks: TBSNetwork<TBSStellarNetworkId>[]
  sorobanServer!: stellarSDK.rpc.Server
  horizonServer!: stellarSDK.Horizon.Server

  readonly feeToken: TBSToken
  readonly tokens: TBSToken[]
  readonly nativeTokens: TBSToken[]

  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService<N>
  tokenService!: ITokenService
  explorerService!: IExplorerService
  ledgerService!: LedgerServiceStellar<N>
  walletConnectService!: IWalletConnectService<N>

  constructor(name: N, network?: TBSNetwork<TBSStellarNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.bip44DerivationPath = BSStellarConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.tokens = [BSStellarConstants.NATIVE_TOKEN]
    this.nativeTokens = [BSStellarConstants.NATIVE_TOKEN]
    this.feeToken = BSStellarConstants.NATIVE_TOKEN

    this.availableNetworks = BSStellarConstants.ALL_NETWORKS
    this.defaultNetwork = BSStellarConstants.MAINNET_NETWORK

    this.setNetwork(network || this.defaultNetwork)

    this.ledgerService = new LedgerServiceStellar(this, getLedgerTransport)
  }

  async getFeeEstimate(length: number): Promise<TBSBigNumber> {
    const feeStats = await this.sorobanServer.getFeeStats()
    const feePerOperation = BSBigNumberHelper.fromDecimals(feeStats.sorobanInclusionFee.min, this.feeToken.decimals)
    const totalFee = feePerOperation.multipliedBy(length)
    return totalFee
  }

  async #ensureTrustline(transaction: stellarSDK.TransactionBuilder, address: string, asset: stellarSDK.Asset) {
    const account = await this.horizonServer.loadAccount(address)

    const hasTrustline = account.balances.some(
      balance =>
        (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') &&
        balance.asset_code === asset.getCode() &&
        balance.asset_issuer === asset.getIssuer()
    )

    if (!hasTrustline) {
      throw new BSError(
        `Receiver address ${address} does not have a trustline for asset ${asset.getCode()} issued by ${asset.getIssuer()}. Please create the trustline before sending tokens.`,
        'TRUSTLINE_NOT_FOUND'
      )
    }
  }

  async #ensureAccountOnChain(address: string) {
    try {
      return await this.sorobanServer.getAccount(address)
    } catch (error) {
      throw new BSError(
        `Receiver address ${address} does not exist on the Stellar network. Please fund the account before sending tokens.`,
        'RECEIVER_ADDRESS_NOT_FOUND',
        error
      )
    }
  }

  async #buildTransferTransaction({ intents, senderAccount }: TTransferParam<N>) {
    const sourceAccount = await this.#ensureAccountOnChain(senderAccount.address)

    const feeBn = await this.getFeeEstimate(intents.length)

    const transaction = new stellarSDK.TransactionBuilder(sourceAccount, {
      fee: BSBigNumberHelper.toDecimals(feeBn, this.feeToken.decimals),
      networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.network.id],
    })

    for (const intent of intents) {
      await this.#ensureAccountOnChain(intent.receiverAddress)

      const isNative = this.tokenService.predicateByHash(intent.token.hash, BSStellarConstants.NATIVE_TOKEN.hash)

      let asset: stellarSDK.Asset
      if (isNative) {
        asset = stellarSDK.Asset.native()
      } else {
        asset = new stellarSDK.Asset(intent.token.symbol, intent.token.hash)
        await this.#ensureTrustline(transaction, intent.receiverAddress, asset)
      }

      transaction.addOperation(
        stellarSDK.Operation.payment({
          destination: intent.receiverAddress,
          asset,
          amount: intent.amount,
        })
      )
    }

    return transaction.setTimeout(30).build()
  }

  async signTransaction(transaction: stellarSDK.Transaction, senderAccount: TBSAccount<N>) {
    if (senderAccount.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (typeof senderAccount.bip44Path !== 'string')
        throw new Error('Your account must have bip44 path to use Ledger')

      const transport = await this.ledgerService.getLedgerTransport(senderAccount)
      return await this.ledgerService.signTransaction(transport, transaction, senderAccount)
    }

    const keypair = stellarSDK.Keypair.fromSecret(senderAccount.key)
    transaction.sign(keypair)
    return transaction
  }

  async createTrustline(senderAccount: TBSAccount<N>, token: TBSToken): Promise<string> {
    let alreadyHaveTrustline = false
    try {
      await this.#ensureAccountOnChain(token.hash)
      alreadyHaveTrustline = true
    } catch {
      /* empty */
    }

    if (alreadyHaveTrustline) {
      throw new Error('Trustline already exists')
    }

    const sourceAccount = await this.#ensureAccountOnChain(senderAccount.address)

    const fee = await this.getFeeEstimate(1)

    const builtTransaction = new stellarSDK.TransactionBuilder(sourceAccount, {
      fee: BSBigNumberHelper.toDecimals(fee, this.feeToken.decimals),
      networkPassphrase: stellarSDK.Networks.PUBLIC,
    })
      .addOperation(stellarSDK.Operation.changeTrust({ asset: new stellarSDK.Asset(token.symbol, token.hash) }))
      .setTimeout(30)
      .build()

    const signedTransaction = await this.signTransaction(builtTransaction, senderAccount)

    const response = await this.sorobanServer.sendTransaction(signedTransaction)

    if (response.status === 'DUPLICATE' || response.status === 'ERROR') {
      throw new Error('Transaction failed: ' + response.errorResult?.result)
    }

    return response.hash
  }

  setNetwork(network: TBSNetwork<TBSStellarNetworkId>) {
    const rpcNetworkUrls = BSStellarConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, rpcNetworkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.rpcNetworkUrls = rpcNetworkUrls
    this.sorobanServer = new stellarSDK.rpc.Server(this.network.url)
    this.horizonServer = new stellarSDK.Horizon.Server(BSStellarConstants.HORIZON_URL_BY_NETWORK_ID[network.id])

    this.tokenService = new TokenServiceStellar()
    this.blockchainDataService = new HorizonBDSStellar(this)
    this.exchangeDataService = new RpcEDSStellar(this)
    this.explorerService = new StellarChainESStellar(this)
    this.walletConnectService = new WalletConnectServiceStellar(this)
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
        id: timeStart,
        method: 'getLatestLedger',
      },
      { timeout: 5000, signal: abortController.signal }
    )

    const latency = Date.now() - timeStart

    clearTimeout(timeout)

    return {
      latency,
      url,
      height: response.data.result.sequence,
    }
  }

  generateAccountFromMnemonic(mnemonic: string, index: number): TBSAccount<N> {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const key = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bip44Path)
    const keypair = stellarSDK.Keypair.fromRawEd25519Seed(key)

    return {
      address: keypair.publicKey(),
      key: keypair.secret(),
      type: 'privateKey',
      bip44Path,
      blockchain: this.name,
    }
  }

  generateAccountFromKey(key: string): TBSAccount<N> {
    const keypair = stellarSDK.Keypair.fromSecret(key)

    return {
      address: keypair.publicKey(),
      key: keypair.secret(),
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
    const isPublicKeyValid = this.validateAddress(publicKey)
    if (!isPublicKeyValid) {
      throw new BSError('Invalid public key', 'INVALID_PUBLIC_KEY')
    }

    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  validateAddress(address: string): boolean {
    return stellarSDK.StrKey.isValidEd25519PublicKey(address)
  }

  validateKey(key: string): boolean {
    return stellarSDK.StrKey.isValidEd25519SecretSeed(key)
  }

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
    const feeBn = await this.getFeeEstimate(param.intents.length)
    return BSBigNumberHelper.toNumber(feeBn, this.feeToken.decimals)
  }

  async transfer(param: TTransferParam<N>): Promise<string[]> {
    const transaction = await this.#buildTransferTransaction(param)
    const signedTransaction = await this.signTransaction(transaction, param.senderAccount)

    const response = await this.sorobanServer.sendTransaction(signedTransaction)

    if (response.status === 'DUPLICATE' || response.status === 'ERROR') {
      throw new Error('Transaction failed: ' + response.errorResult?.result)
    }

    return [response.hash]
  }
}
