import {
  TBSAccount,
  BSBigNumberHelper,
  BSUtilsHelper,
  TGetLedgerTransport,
  IBlockchainDataService,
  IClaimDataService,
  IExchangeDataService,
  IExplorerService,
  INeo3NeoXBridgeService,
  INftDataService,
  ITokenService,
  TNetwork,
  TBSToken,
  TTransferParam,
} from '@cityofzion/blockchain-service'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import Neon from '@cityofzion/neon-core'
import { NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { api, wallet } from '@cityofzion/neon-js'
import { BSNeo3Helper } from './helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from './services/blockchain-data/DoraBDSNeo3'
import { FlamingoForthewinEDSNeo3 } from './services/exchange-data/FlamingoForthewinEDSNeo3'
import { DoraESNeo3 } from './services/explorer/DoraESNeo3'
import { NeonDappKitLedgerServiceNeo3 } from './services/ledger/NeonDappKitLedgerServiceNeo3'
import { GhostMarketNDSNeo3 } from './services/nft-data/GhostMarketNDSNeo3'
import { BSNeo3Constants } from './constants/BSNeo3Constants'
import { RpcBDSNeo3 } from './services/blockchain-data/RpcBDSNeo3'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'

import { DoraVoteServiceNeo3 } from './services/vote/DoraVoteServiceNeo3'
import { IBSNeo3, IVoteService, TBSNeo3NetworkId } from './types'
import { TokenServiceNeo3 } from './services/token/TokenServiceNeo3'
import { RpcCDSNeo3 } from './services/chaim-data/RpcCDSNeo3'

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

  network!: TNetwork<TBSNeo3NetworkId>
  readonly defaultNetwork: TNetwork<TBSNeo3NetworkId>
  readonly availableNetworks: TNetwork<TBSNeo3NetworkId>[]

  blockchainDataService!: IBlockchainDataService
  nftDataService!: INftDataService
  ledgerService: NeonDappKitLedgerServiceNeo3<N>
  exchangeDataService!: IExchangeDataService
  explorerService!: IExplorerService
  voteService!: IVoteService<N>
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>
  tokenService!: ITokenService
  claimDataService!: IClaimDataService

  constructor(name: N, network?: TNetwork<TBSNeo3NetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
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

  #setTokens(network: TNetwork<TBSNeo3NetworkId>) {
    const tokens = BSNeo3Helper.getTokens(network)
    this.tokens = tokens
  }

  async #buildTransferInvocation(
    { intents, tipIntent }: TTransferParam,
    account: Neon.wallet.Account
  ): Promise<ContractInvocation[]> {
    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    const invocations: ContractInvocation[] = []

    for (const intent of concatIntents) {
      let decimals = intent.tokenDecimals
      if (!decimals) {
        try {
          const token = await this.blockchainDataService.getTokenInfo(intent.tokenHash)
          decimals = token.decimals
        } catch (error) {
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

  setNetwork(network: TNetwork<TBSNeo3NetworkId>) {
    const isValidNetwork = this.availableNetworks.some(networkItem => BSUtilsHelper.isEqual(networkItem, network))
    if (!isValidNetwork && (network.type !== 'custom' || typeof network.url !== 'string' || network.url.length === 0)) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.#setTokens(network)

    this.network = network

    this.tokenService = new TokenServiceNeo3()
    this.nftDataService = new GhostMarketNDSNeo3(this)
    this.explorerService = new DoraESNeo3(this)
    this.voteService = new DoraVoteServiceNeo3(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new DoraBDSNeo3(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeo3(this)
    this.claimDataService = new RpcCDSNeo3(this)
  }

  async testNetwork(network: TNetwork<TBSNeo3NetworkId>) {
    const service = new BSNeo3(this.name, network, this.ledgerService.getLedgerTransport)
    const blockchainDataServiceClone = new RpcBDSNeo3(service)
    await blockchainDataServiceClone.getBlockHeight()
  }

  async generateSigningCallback(account: TBSAccount<N>) {
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
    return wallet.isAddress(address, 53)
  }

  validateEncrypted(encryptedKey: string): boolean {
    return wallet.isNEP2(encryptedKey)
  }

  validateKey(key: string): boolean {
    return wallet.isWIF(key) || wallet.isPrivateKey(key)
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.neo')
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): TBSAccount<N> {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', bip44Path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
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
    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<N>> {
    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    return await wallet.encrypt(key, password)
  }

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
    const { neonJsAccount } = await this.generateSigningCallback(param.senderAccount)

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

    const facade = await api.NetworkFacade.fromConfig({ node: this.network.url })

    return await facade.claimGas(neonJsAccount, {
      signingCallback: signingCallback,
    })
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const parser = NeonParser
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

    const parsed = parser.parseRpcResponse(response.stack[0] as any, {
      type: 'Hash160',
    })

    return parser.accountInputToAddress(parsed.replace('0x', ''))
  }
}
