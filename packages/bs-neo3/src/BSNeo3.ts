import {
  BlockchainDataService,
  BlockchainService,
  BSClaimable,
  Account,
  ExchangeDataService,
  BDSClaimable,
  Token,
  BSWithNameService,
  Network,
  PartialBy,
  TransferParam,
  BSCalculableFee,
  NftDataService,
  BSWithNft,
  AccountWithDerivationPath,
  BSWithExplorerService,
  ExplorerService,
  BSWithLedger,
} from '@cityofzion/blockchain-service'
import { api, u, wallet } from '@cityofzion/neon-js'
import Neon from '@cityofzion/neon-core'
import { NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'
import { RPCBDSNeo3 } from './RpcBDSNeo3'
import { DoraBDSNeo3 } from './DoraBDSNeo3'
import { DEFAULT_URL_BY_NETWORK_TYPE, DERIVATION_PATH, NEO_NS_HASH, TOKENS } from './constants'
import { FlamingoEDSNeo3 } from './FlamingoEDSNeo3'
import { GhostMarketNDSNeo3 } from './GhostMarketNDSNeo3'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { DoraESNeo3 } from './DoraESNeo3'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { LedgerServiceNeo3 } from './LedgerServiceNeo3'
import Transport from '@ledgerhq/hw-transport'

export class BSNeo3<BSCustomName extends string = string>
  implements
    BlockchainService,
    BSClaimable,
    BSWithNameService,
    BSCalculableFee,
    BSWithNft,
    BSWithExplorerService,
    BSWithLedger
{
  readonly blockchainName: BSCustomName
  readonly feeToken: Token
  readonly claimToken: Token
  readonly burnToken: Token
  readonly derivationPath: string

  blockchainDataService!: BlockchainDataService & BDSClaimable
  nftDataService!: NftDataService
  ledgerService: LedgerServiceNeo3
  exchangeDataService!: ExchangeDataService
  explorerService!: ExplorerService
  tokens: Token[]
  network!: Network

  constructor(
    blockchainName: BSCustomName,
    network: PartialBy<Network, 'url'>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    this.blockchainName = blockchainName
    this.ledgerService = new LedgerServiceNeo3(getLedgerTransport)
    this.tokens = TOKENS[network.type]
    this.derivationPath = DERIVATION_PATH
    this.feeToken = this.tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = this.tokens.find(token => token.symbol === 'NEO')!
    this.claimToken = this.tokens.find(token => token.symbol === 'GAS')!
    this.setNetwork(network)
  }

  setNetwork(param: PartialBy<Network, 'url'>) {
    const network = {
      type: param.type,
      url: param.url ?? DEFAULT_URL_BY_NETWORK_TYPE[param.type],
    }
    this.network = network

    if (network.type === 'custom') {
      this.blockchainDataService = new RPCBDSNeo3(network, this.feeToken, this.claimToken)
    } else {
      this.blockchainDataService = new DoraBDSNeo3(network, this.feeToken, this.claimToken)
    }

    this.exchangeDataService = new FlamingoEDSNeo3(network.type)
    this.nftDataService = new GhostMarketNDSNeo3(network.type)
    this.explorerService = new DoraESNeo3(network.type)
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

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): AccountWithDerivationPath {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const path = this.derivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', derivationPath: path }
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
    let BsReactNativeDecrypt: any

    try {
      const { NativeModules } = require('react-native')
      BsReactNativeDecrypt = NativeModules.BsReactNativeDecrypt

      if (!BsReactNativeDecrypt) {
        throw new Error('@CityOfZion/bs-react-native-decrypt is not installed')
      }
    } catch {
      const key = await wallet.decrypt(encryptedKey, password)
      return this.generateAccountFromKey(key)
    }

    const privateKey = await BsReactNativeDecrypt.decryptNeo3(encryptedKey, password)
    return this.generateAccountFromKey(privateKey)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const encryptedKey = await wallet.encrypt(key, password)
    return encryptedKey
  }

  async calculateTransferFee(param: TransferParam): Promise<string> {
    const account = new wallet.Account(param.senderAccount.key)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account,
    })

    const invocations = this.buildTransferInvocation(param, account)

    const { total } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return total.toString()
  }

  async transfer(param: TransferParam): Promise<string> {
    let ledgerTransport: Transport | undefined
    if (param.isLedger) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide a getLedgerTransport function to use Ledger')
      ledgerTransport = await this.ledgerService.getLedgerTransport(param.senderAccount)
    }

    const account = new wallet.Account(param.senderAccount.key)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account,
      signingCallback: ledgerTransport ? this.ledgerService.getSigningCallback(ledgerTransport) : undefined,
    })

    const invocations = this.buildTransferInvocation(param, account)

    const transactionHash = await invoker.invokeFunction({
      invocations,
      signers: [],
    })

    return transactionHash
  }

  async claim(account: Account, isLedger?: boolean): Promise<string> {
    let ledgerTransport: Transport | undefined
    if (isLedger) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide a getLedgerTransport function to use Ledger')
      ledgerTransport = await this.ledgerService.getLedgerTransport(account)
    }

    const neoAccount = new wallet.Account(account.key)
    const facade = await api.NetworkFacade.fromConfig({ node: this.network.url })

    const transactionHash = await facade.claimGas(neoAccount, {
      signingCallback: ledgerTransport
        ? this.ledgerService.getSigningCallback(ledgerTransport)
        : api.signWithAccount(neoAccount),
    })

    return transactionHash
  }

  async resolveNameServiceDomain(domainName: string): Promise<any> {
    const parser = NeonParser
    const invoker = await NeonInvoker.init({ rpcAddress: this.network.url })
    const response = await invoker.testInvoke({
      invocations: [
        {
          scriptHash: NEO_NS_HASH,
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

  private buildTransferInvocation(
    { intent, tipIntent }: TransferParam,
    account: Neon.wallet.Account
  ): ContractInvocation[] {
    const intents = [intent, ...(tipIntent ? [tipIntent] : [])]

    const invocations: ContractInvocation[] = intents.map(intent => {
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
          { type: 'Any', value: '' },
        ],
      }
    })

    return invocations
  }
}
