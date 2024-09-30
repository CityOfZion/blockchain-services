import {
  Account,
  BDSClaimable,
  BlockchainDataService,
  BlockchainService,
  BSCalculableFee,
  BSClaimable,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  BSWithSwap,
  ExchangeDataService,
  ExplorerService,
  Network,
  NftDataService,
  SwapService,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import Neon from '@cityofzion/neon-core'
import { NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { api, u, wallet } from '@cityofzion/neon-js'
import Transport from '@ledgerhq/hw-transport'
import { BSNeo3Helper } from './helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from './services/blockchain-data/DoraBDSNeo3'
import { FlamingoEDSNeo3 } from './services/exchange-data/FlamingoEDSNeo3'
import { DoraESNeo3 } from './services/explorer/DoraESNeo3'
import { NeonDappKitLedgerServiceNeo3 } from './services/ledger/NeonDappKitLedgerServiceNeo3'
import { GhostMarketNDSNeo3 } from './services/nft-data/GhostMarketNDSNeo3'
import { FlamingoSwapServiceNeo3 } from './services/swap/FlamingoSwapServiceNeo3'
import { BSNeo3Constants, BSNeo3NetworkId } from './constants/BSNeo3Constants'

export class BSNeo3<BSCustomName extends string = string>
  implements
    BlockchainService<BSCustomName, BSNeo3NetworkId>,
    BSClaimable,
    BSWithNameService,
    BSCalculableFee,
    BSWithNft,
    BSWithExplorerService,
    BSWithLedger,
    BSWithSwap<BSNeo3NetworkId>
{
  blockchainName: BSCustomName
  bip44DerivationPath: string

  tokens!: Token[]
  feeToken!: Token
  claimToken!: Token
  burnToken!: Token

  blockchainDataService!: BlockchainDataService & BDSClaimable
  nftDataService!: NftDataService
  ledgerService: NeonDappKitLedgerServiceNeo3
  exchangeDataService!: ExchangeDataService
  explorerService!: ExplorerService

  network!: Network<BSNeo3NetworkId>

  constructor(
    blockchainName: BSCustomName,
    network?: Network<BSNeo3NetworkId>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    network = network ?? BSNeo3Constants.DEFAULT_NETWORK

    this.blockchainName = blockchainName
    this.ledgerService = new NeonDappKitLedgerServiceNeo3(this, getLedgerTransport)
    this.bip44DerivationPath = BSNeo3Constants.DEFAULT_BIP44_DERIVATION_PATH

    this.setNetwork(network)
  }

  #setTokens(network: Network<BSNeo3NetworkId>) {
    const tokens = BSNeo3Helper.getTokens(network)

    this.tokens = tokens
    this.feeToken = tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = tokens.find(token => token.symbol === 'NEO')!
    this.claimToken = tokens.find(token => token.symbol === 'GAS')!
  }

  async generateSigningCallback(account: Account, isLedger?: boolean) {
    const neonJsAccount = new wallet.Account(account.key)

    if (isLedger) {
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

  #buildTransferInvocation({ intents, tipIntent }: TransferParam, account: Neon.wallet.Account): ContractInvocation[] {
    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    const invocations: ContractInvocation[] = concatIntents.map(intent => {
      return {
        operation: 'transfer',
        scriptHash: intent.tokenHash,
        args: [
          { type: 'Hash160', value: account.address },
          { type: 'Hash160', value: intent.receiverAddress },
          {
            type: 'Integer',
            value: intent.tokenDecimals
              ? u.BigInteger.fromDecimal(intent.amount, intent.tokenDecimals).toString()
              : intent.amount,
          },
          { type: 'Any', value: null },
        ],
      }
    })

    return invocations
  }

  createSwapService(): SwapService<BSNeo3NetworkId> {
    return new FlamingoSwapServiceNeo3(this.network, this)
  }

  setNetwork(network: Network<BSNeo3NetworkId>) {
    this.#setTokens(network)
    this.network = network

    this.blockchainDataService = new DoraBDSNeo3(network, this.feeToken, this.claimToken, this.tokens)
    this.exchangeDataService = new FlamingoEDSNeo3(network)
    this.nftDataService = new GhostMarketNDSNeo3(network)
    this.explorerService = new DoraESNeo3(network)
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
    if (!domainName.endsWith('.neo')) return false
    return true
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Account {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', bip44Path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', bip44Path }
  }

  generateAccountFromPublicKey(publicKey: string): Account {
    if (!wallet.isPublicKey(publicKey)) throw new Error('Invalid public key')

    const account = new wallet.Account(publicKey)

    return {
      address: account.address,
      key: account.publicKey,
      type: 'publicKey',
    }
  }

  generateAccountFromKey(key: string): Account {
    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type }
  }

  async decrypt(encryptedKey: string, password: string): Promise<Account> {
    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const encryptedKey = await wallet.encrypt(key, password)
    return encryptedKey
  }

  async calculateTransferFee(param: TransferParam): Promise<string> {
    const { neonJsAccount } = await this.generateSigningCallback(param.senderAccount, param.isLedger)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
    })

    const invocations = this.#buildTransferInvocation(param, neonJsAccount)

    const { total } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return total.toString()
  }

  async transfer(param: TransferParam): Promise<string[]> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(param.senderAccount, param.isLedger)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const invocations = this.#buildTransferInvocation(param, neonJsAccount)

    const transactionHash = await invoker.invokeFunction({
      invocations,
      signers: [],
    })

    return param.intents.map(() => transactionHash)
  }

  async claim(account: Account, isLedger?: boolean): Promise<string> {
    const { neonJsAccount, signingCallback } = await this.generateSigningCallback(account, isLedger)

    const facade = await api.NetworkFacade.fromConfig({ node: this.network.url })

    const transactionHash = await facade.claimGas(neonJsAccount, {
      signingCallback: signingCallback,
    })

    return transactionHash
  }

  async resolveNameServiceDomain(domainName: string): Promise<any> {
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
    const address = parser.accountInputToAddress(parsed.replace('0x', ''))
    return address
  }
}
