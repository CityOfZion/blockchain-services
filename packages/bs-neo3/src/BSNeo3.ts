import {
  BlockchainDataService,
  BlockchainService,
  Claimable,
  Account,
  Exchange,
  BDSClaimable,
  Token,
  NeoNameService,
  CalculateTransferFeeResponse,
  Network,
  PartialBy,
  TransferParam,
  CalculableFee,
  NftDataService,
  NFTResponse,
  NFTSResponse,
} from '@cityofzion/blockchain-service'
import { api, u, wallet } from '@cityofzion/neon-js'
import Neon from '@cityofzion/neon-core'

import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { ABI_TYPES } from '@cityofzion/neo3-parser'
import { ContractInvocation } from '@cityofzion/neo3-invoker'
import { RPCBDSNeo3 } from './RpcBDSNeo3'
import { DoraBDSNeo3 } from './DoraBDSNeo3'
import { DEFAULT_URL_BY_NETWORK_TYPE, NEO_NS_HASH, TOKENS } from './constants'
import { FlamingoExchange } from './FlamingoExchange'
import { GhostMarketNDS } from './GhostMarketNDS'
import { AsteroidSDK } from '@cityofzion/bs-asteroid-sdk'

export class BSNeo3<BSCustomName extends string = string>
  implements BlockchainService, Claimable, NeoNameService, CalculableFee, NftDataService
{
  blockchainName: BSCustomName
  dataService!: BlockchainDataService & BDSClaimable
  feeToken: Token
  exchange!: Exchange
  tokenClaim: Token
  tokens: Token[]
  network!: Network

  private derivationPath: string = "m/44'/888'/0'/0/?"
  private keychain = new AsteroidSDK.Keychain()
  private ghostMarket: GhostMarketNDS

  constructor(blockchainName: BSCustomName, network: PartialBy<Network, 'url'>) {
    this.blockchainName = blockchainName
    this.tokens = TOKENS[network.type]

    this.feeToken = this.tokens.find(token => token.symbol === 'GAS')!
    this.tokenClaim = this.tokens.find(token => token.symbol === 'GAS')!
    this.setNetwork(network)
    this.ghostMarket = new GhostMarketNDS(this)
  }

  async getNFTS(address: string, page: number = 1): Promise<NFTSResponse> {
    const nftPageLimit = 18
    return await this.ghostMarket.getNFTS({
      owners: [address],
      size: nftPageLimit,
      page,
      getTotal: true,
    })
  }
  async getNFT(tokenID: string, hash: string): Promise<NFTResponse> {
    return await this.ghostMarket.getNFT({
      contract: hash,
      ['tokenIds[]']: [tokenID],
    })
  }

  setNetwork(param: PartialBy<Network, 'url'>) {
    const network = {
      type: param.type,
      url: param.url ?? DEFAULT_URL_BY_NETWORK_TYPE[param.type],
    }
    this.network = network

    if (network.type === 'custom') {
      this.dataService = new RPCBDSNeo3(network)
    } else {
      this.dataService = new DoraBDSNeo3(network)
    }

    this.exchange = new FlamingoExchange(network)
  }

  validateAddress(address: string): boolean {
    return wallet.isAddress(address, 53)
  }

  validateEncryptedKey(encryptedKey: string): boolean {
    return wallet.isNEP2(encryptedKey)
  }

  validateWif(wif: string): boolean {
    return wallet.isWIF(wif)
  }

  validateNNSFormat(domainName: string): boolean {
    if (!domainName.endsWith('.neo')) return false
    return true
  }

  generateMnemonic(): string[] {
    this.keychain.generateMnemonic(128)
    if (!this.keychain.mnemonic) throw new Error('Failed to generate mnemonic')
    return this.keychain.mnemonic.toString().split(' ')
  }

  generateAccount(mnemonic: string[], index: number): Account {
    this.keychain.importMnemonic(mnemonic.join(' '))
    const childKey = this.keychain.generateChildKey('neo', this.derivationPath.replace('?', index.toString()))
    const wif = childKey.getWIF()
    const { address } = new wallet.Account(wif)
    return { address, wif }
  }

  generateAccountFromWif(wif: string): Account {
    const { address } = new wallet.Account(wif)
    return { address, wif }
  }

  async decryptKey(encryptedKey: string, password: string): Promise<Account> {
    let BsReactNativeDecrypt: any

    try {
      const { NativeModules } = require('react-native')
      BsReactNativeDecrypt = NativeModules.BsReactNativeDecrypt
    } catch {
      const key = await wallet.decrypt(encryptedKey, password)
      return this.generateAccountFromWif(key)
    }

    if (!BsReactNativeDecrypt) {
      throw new Error('@CityOfZion/bs-react-native-decrypt is not installed')
    }

    const privateKey = await BsReactNativeDecrypt.decryptNeo3(encryptedKey, password)
    return this.generateAccountFromWif(privateKey)
  }

  async calculateTransferFee(param: TransferParam): Promise<CalculateTransferFeeResponse> {
    const account = new wallet.Account(param.senderAccount.wif)
    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account,
    })

    const invocations = this.buildTransferInvocation(param, account)

    const { networkFee, systemFee, total } = await invoker.calculateFee({
      invocations,
      signers: [],
    })

    return {
      total,
      networkFee: Number(networkFee.toDecimal(8)),
      systemFee: Number(systemFee.toDecimal(8)),
    }
  }

  async transfer(param: TransferParam): Promise<string> {
    const account = new wallet.Account(param.senderAccount.wif)
    const invoker = await NeonInvoker.init({
      rpcAddress: this.network.url,
      account,
    })

    const invocations = this.buildTransferInvocation(param, account)

    const transactionHash = await invoker.invokeFunction({
      invocations,
      signers: [],
    })

    return transactionHash
  }

  async claim(account: Account): Promise<string> {
    const neoAccount = new wallet.Account(account.wif)
    const facade = await api.NetworkFacade.fromConfig({ node: this.network.url })

    const transactionHash = await facade.claimGas(neoAccount, {
      signingCallback: api.signWithAccount(neoAccount),
    })

    return transactionHash
  }

  async getOwnerOfNNS(domainName: string): Promise<any> {
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
      type: ABI_TYPES.HASH160.name,
    })
    const address = parser.accountInputToAddress(parsed.replace('0x', ''))
    return address
  }

  private buildTransferInvocation(param: TransferParam, account: Neon.wallet.Account): ContractInvocation[] {
    const invocations: ContractInvocation[] = param.intents.map(intent => ({
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
    }))

    return invocations
  }
}
