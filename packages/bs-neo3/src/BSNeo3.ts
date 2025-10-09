import {
  TBSAccount,
  BSBigNumberHelper,
  BSKeychainHelper,
  BSUtilsHelper,
  TGetLedgerTransport,
  IBlockchainDataService,
  IClaimDataService,
  IExchangeDataService,
  IExplorerService,
  INeo3NeoXBridgeService,
  INftDataService,
  ITokenService,
  TBSNetwork,
  TBSToken,
  TTransferParam,
  TPingNetworkResponse,
  IWalletConnectService,
} from '@cityofzion/blockchain-service'
import { BSNeo3Helper } from './helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from './services/blockchain-data/DoraBDSNeo3'
import { FlamingoForthewinEDSNeo3 } from './services/exchange-data/FlamingoForthewinEDSNeo3'
import { DoraESNeo3 } from './services/explorer/DoraESNeo3'
import { NeonDappKitLedgerServiceNeo3 } from './services/ledger/NeonDappKitLedgerServiceNeo3'
import { GhostMarketNDSNeo3 } from './services/nft-data/GhostMarketNDSNeo3'
import { BSNeo3Constants } from './constants/BSNeo3Constants'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'
import { DoraVoteServiceNeo3 } from './services/vote/DoraVoteServiceNeo3'
import { IBSNeo3, IVoteService, TBSNeo3NetworkId } from './types'
import { TokenServiceNeo3 } from './services/token/TokenServiceNeo3'
import { RpcCDSNeo3 } from './services/chaim-data/RpcCDSNeo3'
import { api, BSNeo3NeonJsSingletonHelper, wallet } from './helpers/BSNeo3NeonJsSingletonHelper'
import { BSNeo3NeonDappKitSingletonHelper, ContractInvocation } from './helpers/BSNeo3NeonDappKitSingletonHelper'
import axios from 'axios'
import { WalletConnectServiceNeo3 } from './services/wallet-connect/WalletConnectServiceNeo3'

export class BSNeo3<N extends string = string> implements IBSNeo3<N> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = true

  tokens!: TBSToken[]

  readonly nativeTokens!: TBSToken[]
  readonly feeToken!: TBSToken
  readonly claimToken!: TBSToken
  readonly burnToken!: TBSToken

  network!: TBSNetwork<TBSNeo3NetworkId>
  availableNetworkURLs!: string[]
  readonly defaultNetwork: TBSNetwork<TBSNeo3NetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeo3NetworkId>[]

  blockchainDataService!: IBlockchainDataService
  nftDataService!: INftDataService
  ledgerService: NeonDappKitLedgerServiceNeo3<N>
  exchangeDataService!: IExchangeDataService
  explorerService!: IExplorerService
  voteService!: IVoteService<N>
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>
  tokenService!: ITokenService
  claimDataService!: IClaimDataService
  walletConnectService!: IWalletConnectService

  constructor(name: N, network?: TBSNetwork<TBSNeo3NetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new NeonDappKitLedgerServiceNeo3(this, getLedgerTransport)
    this.bip44DerivationPath = BSNeo3Constants.DEFAULT_BIP44_DERIVATION_PATH

    this.nativeTokens = BSNeo3Constants.NATIVE_ASSETS
    this.feeToken = BSNeo3Constants.GAS_TOKEN
    this.burnToken = BSNeo3Constants.NEO_TOKEN
    this.claimToken = BSNeo3Constants.GAS_TOKEN

    this.availableNetworks = BSNeo3Constants.ALL_NETWORKS
    this.defaultNetwork = BSNeo3Constants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  #setTokens(network: TBSNetwork<TBSNeo3NetworkId>) {
    const tokens = BSNeo3Helper.getTokens(network)
    this.tokens = tokens
  }

  async #buildTransferInvocation(
    { intents, tipIntent }: TTransferParam,
    account: wallet.Account
  ): Promise<ContractInvocation[]> {
    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    const invocations: ContractInvocation[] = []

    for (const intent of concatIntents) {
      let decimals = intent.tokenDecimals
      if (!decimals) {
        try {
          const token = await this.blockchainDataService.getTokenInfo(intent.tokenHash)
          decimals = token.decimals
        } catch {
          decimals = 8
        }
      }

      invocations.push({
        operation: 'transfer',
        scriptHash: intent.tokenHash,
        args: [
          { type: 'Hash160', value: account.address },
          { type: 'Hash160', value: intent.receiverAddress },
          {
            type: 'Integer',
            value: BSBigNumberHelper.toDecimals(BSBigNumberHelper.fromNumber(intent.amount), decimals),
          },
          { type: 'Any', value: null },
        ],
      })
    }

    return invocations
  }

  setNetwork(network: TBSNetwork<TBSNeo3NetworkId>) {
    const availableURLs = BSNeo3Constants.RPC_LIST_BY_NETWORK_ID[network.id] || []

    if (network.type === 'custom') {
      if (typeof network.url !== 'string' || network.url.length === 0) {
        throw new Error('You must provide a valid url to use a custom network')
      }
    } else {
      const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, availableURLs)
      if (!isValidNetwork) {
        throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
      }
    }

    this.#setTokens(network)

    this.network = network
    this.availableNetworkURLs = availableURLs

    this.tokenService = new TokenServiceNeo3()
    this.nftDataService = new GhostMarketNDSNeo3(this)
    this.explorerService = new DoraESNeo3(this)
    this.voteService = new DoraVoteServiceNeo3(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new DoraBDSNeo3(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeo3(this)
    this.claimDataService = new RpcCDSNeo3(this)
    this.walletConnectService = new WalletConnectServiceNeo3(this)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNetwork(network: TBSNetwork<TBSNeo3NetworkId>): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()

    const response = await axios.post(
      network.url,
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
      url: network.url,
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

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): TBSAccount<N> {
    const mnemonicStr = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const key = BSKeychainHelper.generateNeoPrivateKeyFromMnemonic(mnemonicStr, bip44Path)

    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const { address, WIF } = new wallet.Account(key)
    return { address, key: WIF, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
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

  generateAccountFromKey(key: string): TBSAccount<N> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<N>> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    return await wallet.encrypt(key, password)
  }

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
    const { neonJsAccount } = await this.generateSigningCallback(param.senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
    })

    const invocations = await this.#buildTransferInvocation(param, neonJsAccount)

    const { total } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return total.toString()
  }

  async transfer(param: TTransferParam<N>): Promise<string[]> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(param.senderAccount)
    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const invocations = await this.#buildTransferInvocation(param, neonJsAccount)

    const transactionHash = await invoker.invokeFunction({
      invocations,
      signers: [],
    })

    return param.intents.map(() => transactionHash)
  }

  async claim(account: TBSAccount<N>): Promise<string> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(account)

    const { api } = BSNeo3NeonJsSingletonHelper.getInstance()

    const facade = await api.NetworkFacade.fromConfig({ node: this.network.url })

    return await facade.claimGas(neonJsAccount, {
      signingCallback: signingCallback,
    })
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
