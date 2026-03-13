import {
  BSBigNumberHelper,
  BSKeychainHelper,
  BSUtilsHelper,
  type IBlockchainDataService,
  type IClaimDataService,
  type IExchangeDataService,
  type IExplorerService,
  type INeo3NeoXBridgeService,
  type INftDataService,
  type ITokenService,
  type IWalletConnectService,
  type TBSAccount,
  type TBSNetwork,
  type TBSToken,
  type TGetLedgerTransport,
  type TPingNetworkResponse,
  type TTransferParams,
  type IFullTransactionsDataService,
  type TTransactionDefault,
  BSError,
} from '@cityofzion/blockchain-service'
import { BSNeo3Helper } from './helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from './services/blockchain-data/DoraBDSNeo3'
import { FlamingoForthewinEDSNeo3 } from './services/exchange-data/FlamingoForthewinEDSNeo3'
import { DoraESNeo3 } from './services/explorer/DoraESNeo3'
import { NeonDappKitLedgerServiceNeo3 } from './services/ledger/NeonDappKitLedgerServiceNeo3'
import { GhostMarketNDSNeo3 } from './services/nft-data/GhostMarketNDSNeo3'
import { BSNeo3Constants } from './constants/BSNeo3Constants'
import { Neo3NeoXBridgeService } from './services/neo3-neox-bridge/Neo3NeoXBridgeService'
import { DoraVoteServiceNeo3 } from './services/vote/DoraVoteServiceNeo3'
import type { IBSNeo3, IVoteService, TBSNeo3NetworkId } from './types'
import { TokenServiceNeo3 } from './services/token/TokenServiceNeo3'
import { RpcCDSNeo3 } from './services/chaim-data/RpcCDSNeo3'
import { api, BSNeo3NeonJsSingletonHelper, wallet } from './helpers/BSNeo3NeonJsSingletonHelper'
import { BSNeo3NeonDappKitSingletonHelper, ContractInvocation } from './helpers/BSNeo3NeonDappKitSingletonHelper'
import axios from 'axios'
import { WalletConnectServiceNeo3 } from './services/wallet-connect/WalletConnectServiceNeo3'
import { DoraFullTransactionsDataServiceNeo3 } from './services/full-transactions-data/DoraFullTransactionsDataServiceNeo3'

export class BSNeo3<N extends string = string> implements IBSNeo3<N> {
  readonly name: N
  readonly bipDerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = true

  tokens!: TBSToken[]

  readonly nativeTokens!: TBSToken[]
  readonly feeToken!: TBSToken
  readonly claimToken!: TBSToken
  readonly burnToken!: TBSToken

  network!: TBSNetwork<TBSNeo3NetworkId>
  networkUrls!: string[]
  readonly defaultNetwork: TBSNetwork<TBSNeo3NetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeo3NetworkId>[]

  blockchainDataService!: IBlockchainDataService<N>
  nftDataService!: INftDataService
  ledgerService!: NeonDappKitLedgerServiceNeo3<N>
  exchangeDataService!: IExchangeDataService
  explorerService!: IExplorerService
  voteService!: IVoteService<N>
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>
  tokenService!: ITokenService
  claimDataService!: IClaimDataService
  walletConnectService!: IWalletConnectService<N>
  fullTransactionsDataService!: IFullTransactionsDataService<N>

  constructor(name: N, network?: TBSNetwork<TBSNeo3NetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new NeonDappKitLedgerServiceNeo3(this, getLedgerTransport)
    this.bipDerivationPath = BSNeo3Constants.DEFAULT_BIP_DERIVATION_PATH

    this.nativeTokens = BSNeo3Constants.NATIVE_ASSETS
    this.feeToken = BSNeo3Constants.GAS_TOKEN
    this.burnToken = BSNeo3Constants.NEO_TOKEN
    this.claimToken = BSNeo3Constants.GAS_TOKEN

    this.availableNetworks = BSNeo3Constants.ALL_NETWORKS
    this.defaultNetwork = BSNeo3Constants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  #setTokens(network: TBSNetwork<TBSNeo3NetworkId>) {
    this.tokens = BSNeo3Helper.getTokens(network)
  }

  async #buildTransferInvocation(
    { intents }: TTransferParams<N>,
    account: wallet.Account
  ): Promise<ContractInvocation[]> {
    const invocations: ContractInvocation[] = []

    for (const intent of intents) {
      const { token } = intent

      invocations.push({
        operation: 'transfer',
        scriptHash: token.hash,
        args: [
          { type: 'Hash160', value: account.address },
          { type: 'Hash160', value: intent.receiverAddress },
          {
            type: 'Integer',
            value: BSBigNumberHelper.toDecimals(BSBigNumberHelper.fromNumber(intent.amount), token.decimals),
          },
          { type: 'Any', value: null },
        ],
      })
    }

    return invocations
  }

  #buildClaimParams(senderAccount: TBSAccount<N>): TTransferParams<N> {
    return {
      senderAccount,
      intents: [{ amount: '0', receiverAddress: senderAccount.address, token: this.burnToken }],
    }
  }

  setNetwork(network: TBSNetwork<TBSNeo3NetworkId>) {
    const networkUrls = BSNeo3Constants.RPC_LIST_BY_NETWORK_ID[network.id] || []

    if (network.type === 'custom') {
      if (typeof network.url !== 'string' || network.url.length === 0) {
        throw new Error('You must provide a valid url to use a custom network')
      }
    } else {
      const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

      if (!isValidNetwork) {
        throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
      }
    }

    this.#setTokens(network)

    this.network = network
    this.networkUrls = networkUrls

    this.tokenService = new TokenServiceNeo3()
    this.nftDataService = new GhostMarketNDSNeo3(this)
    this.explorerService = new DoraESNeo3(this)
    this.voteService = new DoraVoteServiceNeo3(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new DoraBDSNeo3(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeo3(this)
    this.claimDataService = new RpcCDSNeo3(this)
    this.walletConnectService = new WalletConnectServiceNeo3(this)
    this.fullTransactionsDataService = new DoraFullTransactionsDataServiceNeo3(this)
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

  async generateSigningCallback(account: TBSAccount<N>): Promise<{
    neonJsAccount: wallet.Account
    signingCallback: api.SigningFunction
  }> {
    const { wallet, api } = BSNeo3NeonJsSingletonHelper.getInstance()
    const neonJsAccount = new wallet.Account(account.key)

    if (account.isHardware) {
      if (!this.ledgerService.getLedgerTransport) {
        throw new Error('You must provide a getLedgerTransport function to use Ledger')
      }

      if (!account.bipPath) {
        throw new Error('Account must have BIP path to use Ledger')
      }

      const ledgerTransport = await this.ledgerService.getLedgerTransport(account)

      return {
        neonJsAccount,
        signingCallback: this.ledgerService.getSigningCallback(ledgerTransport, account),
      }
    }

    return {
      neonJsAccount,
      signingCallback: api.signWithAccount(neonJsAccount),
    }
  }

  validateAddress(address: string): boolean {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return wallet.isAddress(address, 53)
  }

  validateEncrypted(encryptedKey: string): boolean {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return wallet.isNEP2(encryptedKey)
  }

  validateKey(key: string): boolean {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return wallet.isWIF(key) || wallet.isPrivateKey(key)
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.neo')
  }

  async generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Promise<TBSAccount<N>> {
    const mnemonicText = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const key = BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(mnemonicText, bipPath)
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const { address, WIF } = new wallet.Account(key)

    return { address, key: WIF, type: 'wif', bipPath, blockchain: this.name }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<N>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    if (!wallet.isPublicKey(publicKey)) throw new Error('Invalid public key')

    const account = new wallet.Account(publicKey)

    return {
      address: account.address,
      key: account.publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<N>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    let type: TBSAccount<N>['type'] | undefined = undefined

    if (wallet.isWIF(key)) {
      type = 'wif'
    } else if (wallet.isPrivateKey(key)) {
      type = 'privateKey'
    }

    if (!type) throw new BSError('Invalid key', 'INVALID_KEY')

    const { address } = new wallet.Account(key)

    return { address, key, type, blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<N>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const key = await wallet.decrypt(encryptedKey, password)
    return await this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return await wallet.encrypt(key, password)
  }

  async calculateTransferFee(params: TTransferParams<N>): Promise<string> {
    const { neonJsAccount } = await this.generateSigningCallback(params.senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
    })

    const invocations = await this.#buildTransferInvocation(params, neonJsAccount)

    const { total } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return total.toString()
  }

  async transfer(params: TTransferParams<N>): Promise<TTransactionDefault<N>[]> {
    const { senderAccount } = params
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const invocations = await this.#buildTransferInvocation(params, neonJsAccount)
    const cim = { invocations, signers: [] }
    const fees = await invoker.calculateFee(cim)
    const txId = await invoker.invokeFunction(cim)
    const { address } = senderAccount
    const addressUrl = this.explorerService.buildAddressUrl(address)

    return [
      {
        txId,
        txIdUrl: this.explorerService.buildTransactionUrl(txId),
        date: new Date().toJSON(),
        invocationCount: invocations.length,
        networkFeeAmount: BSBigNumberHelper.format(fees.networkFee, { decimals: this.feeToken.decimals }),
        systemFeeAmount: BSBigNumberHelper.format(fees.systemFee, { decimals: this.feeToken.decimals }),
        type: 'default',
        view: 'default',
        events: params.intents.map(({ receiverAddress, amount, token }) => {
          const tokenHash = token.hash

          return {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: addressUrl,
            to: receiverAddress,
            toUrl: this.explorerService.buildAddressUrl(receiverAddress),
            tokenType: 'nep-17',
            tokenUrl: this.explorerService.buildContractUrl(tokenHash),
            token,
          }
        }),
      },
    ]
  }

  async calculateClaimFee(senderAccount: TBSAccount<N>): Promise<string> {
    return this.calculateTransferFee(this.#buildClaimParams(senderAccount))
  }

  async claim(senderAccount: TBSAccount<N>): Promise<TTransactionDefault<N>> {
    const [transaction] = await this.transfer(this.#buildClaimParams(senderAccount))

    transaction.type = 'claim'

    return transaction
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const { NeonParser, NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()
    const invoker = await NeonInvoker.init({ rpcAddress: this.network.url })

    const response = await invoker.testInvoke({
      invocations: [
        {
          scriptHash: BSNeo3Constants.NEO_NS_HASH,
          operation: 'ownerOf',
          args: [{ type: 'String', value: domainName }],
        },
      ],
    })

    if (response.stack.length === 0) {
      throw new Error(response.exception ?? 'unrecognized response')
    }

    const parsed = NeonParser.parseRpcResponse(response.stack[0] as any, {
      type: 'Hash160',
    })

    return NeonParser.accountInputToAddress(parsed.replace('0x', ''))
  }
}
