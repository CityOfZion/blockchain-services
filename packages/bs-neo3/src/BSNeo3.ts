import {
  BSKeychainHelper,
  BSUtilsHelper,
  type IBlockchainDataService,
  type IExchangeDataService,
  type IExplorerService,
  type INftDataService,
  type ITokenService,
  type TBSAccount,
  type TBSNetwork,
  type TBSToken,
  type TGetLedgerTransport,
  type TPingNetworkResponse,
  type TTransferParams,
  type IFullTransactionsDataService,
  type TTransactionDefault,
  BSError,
  type TClaimServiceTransactionData,
  type TTransactionDefaultTokenEvent,
  type TTransactionDefaultEvent,
  BSBigHumanAmount,
} from '@cityofzion/blockchain-service'
import { BSNeo3Helper } from './helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from './services/blockchain-data/DoraBDSNeo3'
import { FlamingoForthewinEDSNeo3 } from './services/exchange-data/FlamingoForthewinEDSNeo3'
import { DoraESNeo3 } from './services/explorer/DoraESNeo3'
import { NeonDappKitLedgerServiceNeo3 } from './services/ledger/NeonDappKitLedgerServiceNeo3'
import { GhostMarketNDSNeo3 } from './services/nft-data/GhostMarketNDSNeo3'
import { BSNeo3Constants } from './constants/BSNeo3Constants'
import { Neo3NeoXBridgeService } from './services/neo3-neox-bridge/Neo3NeoXBridgeService'
import { VoteServiceNeo3 } from './services/vote/VoteServiceNeo3'
import type { IBSNeo3, TBSNeo3Name, TBSNeo3NetworkId } from './types'
import { TokenServiceNeo3 } from './services/token/TokenServiceNeo3'
import { api, BSNeo3NeonJsSingletonHelper, wallet } from './helpers/BSNeo3NeonJsSingletonHelper'
import { BSNeo3NeonDappKitSingletonHelper, ContractInvocation } from './helpers/BSNeo3NeonDappKitSingletonHelper'
import axios from 'axios'
import { WalletConnectServiceNeo3 } from './services/wallet-connect/WalletConnectServiceNeo3'
import { DoraFullTransactionsDataServiceNeo3 } from './services/full-transactions-data/DoraFullTransactionsDataServiceNeo3'
import { ClaimServiceNeo3 } from './services/claim/ClaimServiceNeo3'

export class BSNeo3 implements IBSNeo3 {
  readonly name = 'neo3'
  readonly bipDerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = true

  tokens!: TBSToken[]

  readonly nativeTokens!: TBSToken[]
  readonly feeToken!: TBSToken

  network!: TBSNetwork<TBSNeo3NetworkId>
  networkUrls!: string[]
  readonly defaultNetwork: TBSNetwork<TBSNeo3NetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeo3NetworkId>[]

  blockchainDataService!: IBlockchainDataService
  nftDataService!: INftDataService
  ledgerService!: NeonDappKitLedgerServiceNeo3
  exchangeDataService!: IExchangeDataService
  explorerService!: IExplorerService
  voteService!: VoteServiceNeo3
  neo3NeoXBridgeService!: Neo3NeoXBridgeService
  tokenService!: ITokenService
  claimService!: ClaimServiceNeo3
  walletConnectService!: WalletConnectServiceNeo3
  fullTransactionsDataService!: IFullTransactionsDataService

  constructor(network?: TBSNetwork<TBSNeo3NetworkId>, getLedgerTransport?: TGetLedgerTransport<TBSNeo3Name>) {
    this.ledgerService = new NeonDappKitLedgerServiceNeo3(this, getLedgerTransport)
    this.bipDerivationPath = BSNeo3Constants.DEFAULT_BIP_DERIVATION_PATH

    this.nativeTokens = BSNeo3Constants.NATIVE_ASSETS
    this.feeToken = BSNeo3Constants.GAS_TOKEN

    this.availableNetworks = BSNeo3Constants.ALL_NETWORKS
    this.defaultNetwork = BSNeo3Constants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  #setTokens(network: TBSNetwork<TBSNeo3NetworkId>) {
    this.tokens = BSNeo3Helper.getTokens(network)
  }

  async #buildTransferInvocation(
    { intents }: TTransferParams<TBSNeo3Name>,
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
            value: new BSBigHumanAmount(intent.amount, intent.token.decimals).toUnit().toString(),
          },
          { type: 'Any', value: null },
        ],
      })
    }

    return invocations
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

    this.tokenService = new TokenServiceNeo3(this)
    this.nftDataService = new GhostMarketNDSNeo3(this)
    this.explorerService = new DoraESNeo3(this)
    this.voteService = new VoteServiceNeo3(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new DoraBDSNeo3(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeo3(this)
    this.claimService = new ClaimServiceNeo3(this)
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

  async _generateSigningCallback(account: TBSAccount<TBSNeo3Name>): Promise<{
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

  async generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Promise<TBSAccount<TBSNeo3Name>> {
    const mnemonicText = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const key = BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(mnemonicText, bipPath)
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const { address, WIF } = new wallet.Account(key)

    return { address, key: WIF, type: 'wif', bipPath, blockchain: this.name }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<TBSNeo3Name>> {
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

  async generateAccountFromKey(key: string): Promise<TBSAccount<TBSNeo3Name>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    let type: TBSAccount<TBSNeo3Name>['type'] | undefined = undefined

    if (wallet.isWIF(key)) {
      type = 'wif'
    } else if (wallet.isPrivateKey(key)) {
      type = 'privateKey'
    }

    if (!type) throw new BSError('Invalid key', 'INVALID_KEY')

    const { address } = new wallet.Account(key)

    return { address, key, type, blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<TBSNeo3Name>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const key = await wallet.decrypt(encryptedKey, password)
    return await this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return await wallet.encrypt(key, password)
  }

  async calculateTransferFee(params: TTransferParams<TBSNeo3Name>): Promise<string> {
    const { neonJsAccount } = await this._generateSigningCallback(params.senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
    })

    const invocations = await this.#buildTransferInvocation(params, neonJsAccount)

    const { networkFee, systemFee } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return new BSBigHumanAmount(networkFee, this.feeToken.decimals).plus(systemFee).toFormatted()
  }

  async transfer(params: TTransferParams<TBSNeo3Name>): Promise<TTransactionDefault[]> {
    const { senderAccount } = params
    const { neonJsAccount, signingCallback } = await this._generateSigningCallback(senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    // Verify if the transfer includes any NEO token, if so the chain will automatically claim the GAS for the sender
    let data: any | undefined
    let claimEvent: TTransactionDefaultTokenEvent | undefined = undefined

    if (
      params.intents.some(intent => this.tokenService.predicateByHash(intent.token.hash, BSNeo3Constants.NEO_TOKEN))
    ) {
      claimEvent = await this.claimService._buildTransactionEvent(senderAccount.address)
      data = { isClaim: true } as TClaimServiceTransactionData
    }

    const { address } = senderAccount

    const invocations = await this.#buildTransferInvocation(params, neonJsAccount)
    const invocationMulti = { invocations, signers: [] }

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })
    const fees = await invoker.calculateFee(invocationMulti)
    const txId = await invoker.invokeFunction(invocationMulti)

    const events: TTransactionDefaultEvent[] = params.intents.map(({ receiverAddress, amount, token }) => ({
      eventType: 'token',
      amount,
      methodName: 'transfer',
      from: address,
      fromUrl: this.explorerService.buildAddressUrl(address),
      to: receiverAddress,
      toUrl: this.explorerService.buildAddressUrl(receiverAddress),
      tokenUrl: this.explorerService.buildContractUrl(token.hash),
      token,
    }))

    if (claimEvent) {
      events.unshift(claimEvent)
    }

    return [
      {
        txId,
        txIdUrl: this.explorerService.buildTransactionUrl(txId),
        date: new Date().toJSON(),
        invocationCount: invocations.length,
        networkFeeAmount: new BSBigHumanAmount(fees.networkFee, this.feeToken.decimals).toFormatted(),
        systemFeeAmount: new BSBigHumanAmount(fees.systemFee, this.feeToken.decimals).toFormatted(),
        view: 'default',
        events,
        data,
      },
    ]
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
