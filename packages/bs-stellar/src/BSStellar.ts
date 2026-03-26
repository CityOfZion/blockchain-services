import {
  BSBigNumberHelper,
  BSError,
  BSKeychainHelper,
  BSUtilsHelper,
  type IBlockchainDataService,
  type IExchangeDataService,
  type IExplorerService,
  type ITokenService,
  type TBSAccount,
  type TBSBigNumber,
  type TBSNetwork,
  type TBSToken,
  type TGetLedgerTransport,
  type TPingNetworkResponse,
  type TTransaction,
  type TTransactionDefault,
  type TTransferParams,
} from '@cityofzion/blockchain-service'
import type { IBSStellar, TBSStellarFriendBotResponse, TBSStellarName, TBSStellarNetworkId } from './types'
import { BSStellarConstants } from './constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'
import axios from 'axios'
import { TokenServiceStellar } from './services/token/TokenServiceStellar'
import { HorizonBDSStellar } from './services/blockchain-data/HorizonBDSStellar'
import { RpcEDSStellar } from './services/exchange/RpcEDSStellar'
import { StellarChainESStellar } from './services/explorer/StellarChainESStellar'
import { LedgerServiceStellar } from './services/ledger/LedgerServiceStellar'
import { WalletConnectServiceStellar } from './services/wallet-connect/WalletConnectServiceStellar'
import { TrustlineServiceStellar } from './services/trustline/TrustlineServiceStellar'

export class BSStellar implements IBSStellar {
  readonly name = 'stellar'

  readonly bipDerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = false
  readonly amountToCreateAccount: string = '1'

  network!: TBSNetwork<TBSStellarNetworkId>
  networkUrls!: string[]
  readonly defaultNetwork: TBSNetwork<TBSStellarNetworkId>
  readonly availableNetworks: TBSNetwork<TBSStellarNetworkId>[]
  _sorobanServer!: stellarSDK.rpc.Server
  _horizonServer!: stellarSDK.Horizon.Server

  readonly feeToken: TBSToken
  readonly tokens: TBSToken[]
  readonly nativeTokens: TBSToken[]

  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService
  tokenService!: ITokenService
  explorerService!: IExplorerService
  ledgerService!: LedgerServiceStellar
  walletConnectService!: WalletConnectServiceStellar
  trustlineService!: TrustlineServiceStellar

  constructor(network?: TBSNetwork<TBSStellarNetworkId>, getLedgerTransport?: TGetLedgerTransport<TBSStellarName>) {
    this.bipDerivationPath = BSStellarConstants.DEFAULT_BIP_DERIVATION_PATH

    this.tokens = [BSStellarConstants.NATIVE_TOKEN]
    this.nativeTokens = [BSStellarConstants.NATIVE_TOKEN]
    this.feeToken = BSStellarConstants.NATIVE_TOKEN

    this.availableNetworks = BSStellarConstants.ALL_NETWORKS
    this.defaultNetwork = BSStellarConstants.MAINNET_NETWORK

    this.setNetwork(network || this.defaultNetwork)

    this.ledgerService = new LedgerServiceStellar(this, getLedgerTransport)
  }

  async _getFeeEstimate(length: number): Promise<TBSBigNumber> {
    const feeStats = await this._sorobanServer.getFeeStats()
    const feePerOperation = BSBigNumberHelper.fromDecimals(feeStats.sorobanInclusionFee.min, this.feeToken.decimals)

    return feePerOperation.multipliedBy(length)
  }

  async _ensureAccountOnChain(address: string): Promise<stellarSDK.Account> {
    try {
      return await this._sorobanServer.getAccount(address)
    } catch (error) {
      throw new BSError(
        `Address ${address} does not exist on the Stellar network. Please fund the account before sending tokens.`,
        'ADDRESS_NOT_FOUND',
        error
      )
    }
  }

  async _signTransaction(transaction: stellarSDK.Transaction, senderAccount: TBSAccount<TBSStellarName>) {
    if (senderAccount.isHardware) {
      if (!this.ledgerService.getLedgerTransport) {
        throw new BSError(
          'You must provide getLedgerTransport function to use Ledger',
          'GET_LEDGER_TRANSPORT_NOT_FOUND'
        )
      }

      if (!senderAccount.bipPath) {
        throw new BSError('Account must have BIP path to use Ledger', 'BIP_PATH_NOT_FOUND')
      }

      const transport = await this.ledgerService.getLedgerTransport(senderAccount)
      return await this.ledgerService.signTransaction(transport, transaction, senderAccount)
    }

    const keypair = stellarSDK.Keypair.fromSecret(senderAccount.key)
    transaction.sign(keypair)
    return transaction
  }

  async #buildTransferTransaction({ intents, senderAccount }: TTransferParams<TBSStellarName>) {
    const sourceAccount = await this._ensureAccountOnChain(senderAccount.address)

    const feeBn = await this._getFeeEstimate(intents.length)

    const transaction = new stellarSDK.TransactionBuilder(sourceAccount, {
      fee: BSBigNumberHelper.toDecimals(feeBn, this.feeToken.decimals),
      networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.network.id],
    })

    for (const intent of intents) {
      await this._ensureAccountOnChain(intent.receiverAddress)

      const isNative = this.tokenService.predicateByHash(intent.token.hash, BSStellarConstants.NATIVE_TOKEN.hash)

      let asset: stellarSDK.Asset
      if (isNative) {
        asset = stellarSDK.Asset.native()
      } else {
        asset = new stellarSDK.Asset(intent.token.symbol, intent.token.hash)

        const hasTrustline = await this.trustlineService.hasTrustline({
          address: senderAccount.address,
          token: intent.token,
        })

        if (!hasTrustline) {
          throw new BSError(
            `Sender account does not have a trustline for token ${intent.token.symbol}. Please create a trustline before sending this token.`,
            'TRUSTLINE_NOT_FOUND'
          )
        }
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

  setNetwork(network: TBSNetwork<TBSStellarNetworkId>) {
    const networkUrls = BSStellarConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new BSError(`Network with id ${network.id} is not available for ${this.name}`, 'INVALID_NETWORK')
    }

    this.network = network
    this.networkUrls = networkUrls
    this._sorobanServer = new stellarSDK.rpc.Server(this.network.url)
    this._horizonServer = new stellarSDK.Horizon.Server(BSStellarConstants.HORIZON_URL_BY_NETWORK_ID[network.id])

    this.tokenService = new TokenServiceStellar(this)
    this.blockchainDataService = new HorizonBDSStellar(this)
    this.exchangeDataService = new RpcEDSStellar(this)
    this.explorerService = new StellarChainESStellar(this)
    this.walletConnectService = new WalletConnectServiceStellar(this)
    this.trustlineService = new TrustlineServiceStellar(this)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNetwork(url: string): Promise<TPingNetworkResponse> {
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

  async generateAccountFromMnemonic(mnemonic: string, index: number): Promise<TBSAccount<TBSStellarName>> {
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const key = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bipPath)
    const keypair = stellarSDK.Keypair.fromRawEd25519Seed(key)

    return {
      address: keypair.publicKey(),
      key: keypair.secret(),
      type: 'privateKey',
      blockchain: this.name,
      bipPath,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<TBSStellarName>> {
    const keypair = stellarSDK.Keypair.fromSecret(key)

    return {
      address: keypair.publicKey(),
      key: keypair.secret(),
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<TBSStellarName>> {
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

  async calculateTransferFee(params: TTransferParams<TBSStellarName>): Promise<string> {
    const feeBn = await this._getFeeEstimate(params.intents.length)
    return BSBigNumberHelper.toNumber(feeBn, this.feeToken.decimals)
  }

  async transfer(params: TTransferParams<TBSStellarName>): Promise<TTransactionDefault[]> {
    const transaction = await this.#buildTransferTransaction(params)
    const { senderAccount } = params
    const signedTransaction = await this._signTransaction(transaction, senderAccount)
    const response = await this._sorobanServer.sendTransaction(signedTransaction)

    if (BSStellarConstants.INVALID_TRANSACTION_STATUS.includes(response.status)) {
      throw new BSError(`Transaction failed: ${response.errorResult?.result}`, 'TRANSACTION_FAILED')
    }

    const txId = response.hash
    const { address } = senderAccount

    return [
      {
        txId,
        txIdUrl: this.explorerService.buildTransactionUrl(txId),
        date: new Date().toJSON(),
        networkFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(transaction.fee, this.feeToken.decimals),
          { decimals: this.feeToken.decimals }
        ),
        view: 'default',
        events: params.intents.map(({ amount, receiverAddress, token }, index) => {
          const tokenHash = token.hash

          return {
            eventType: 'token',
            amount,
            methodName: transaction.operations[index].type,
            from: address,
            fromUrl: this.explorerService.buildAddressUrl(address),
            to: receiverAddress,
            toUrl: this.explorerService.buildAddressUrl(receiverAddress),
            tokenUrl: this.explorerService.buildContractUrl(tokenHash),
            token,
          }
        }),
      },
    ]
  }

  async faucet(address: string): Promise<TTransaction> {
    const response = await axios.get<TBSStellarFriendBotResponse>('https://friendbot.stellar.org', {
      params: { addr: address },
    })

    if (response.status !== 200 || response.data.successful !== true) {
      throw new BSError(`Failed to fund account: ${response.statusText}`, 'FUNDING_FAILED')
    }

    const transaction = stellarSDK.TransactionBuilder.fromXDR(
      response.data.envelope_xdr,
      BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.network.id]
    )

    const operation = transaction.operations[0] as stellarSDK.Operation.Payment

    const from = operation.source
    const to = operation.destination
    const txId = response.data.hash

    return {
      txId: txId,
      txIdUrl: this.explorerService.buildTransactionUrl(txId),
      date: new Date().toJSON(),
      view: 'default',
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(transaction.fee, this.feeToken.decimals),
        { decimals: this.feeToken.decimals }
      ),
      events: [
        {
          eventType: 'token',
          methodName: 'payment',
          from,
          fromUrl: from ? this.explorerService.buildAddressUrl(from) : undefined,
          to,
          toUrl: to ? this.explorerService.buildAddressUrl(to) : undefined,
          token: BSStellarConstants.NATIVE_TOKEN,
          amount: operation.amount,
          tokenUrl: this.explorerService.buildContractUrl(BSStellarConstants.NATIVE_TOKEN.hash),
        },
      ],
    }
  }
}
