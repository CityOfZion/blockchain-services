import {
  Account,
  BDSClaimable,
  BlockchainDataService,
  BlockchainService,
  Claimable,
  Exchange,
  Token,
  Network,
  PartialBy,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { AsteroidSDK } from '@cityofzion/bs-asteroid-sdk'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { DEFAULT_URL_BY_NETWORK_TYPE, LEGACY_NETWORK_BY_NETWORK_TYPE, NATIVE_ASSETS, TOKENS } from './constants'
import { DoraBDSNeoLegacy } from './DoraBDSNeoLegacy'
import { CryptoCompareExchange } from './exchange/CryptoCompareExchange'

export class BSNeoLegacy<BSCustomName extends string = string> implements BlockchainService, Claimable {
  dataService!: BlockchainDataService & BDSClaimable
  blockchainName: BSCustomName
  feeToken: Token
  exchange!: Exchange
  tokenClaim: Token
  tokens: Token[]
  network!: Network
  legacyNetwork: string

  private derivationPath: string = "m/44'/888'/0'/0/?"
  private keychain = new AsteroidSDK.Keychain()

  constructor(blockchainName: BSCustomName, network: PartialBy<Network, 'url'>) {
    if (network.type === 'custom') throw new Error('Custom network is not supported for NEO Legacy')

    this.blockchainName = blockchainName
    this.legacyNetwork = LEGACY_NETWORK_BY_NETWORK_TYPE[network.type]
    this.tokens = TOKENS[network.type]
    this.tokenClaim = this.tokens.find(token => token.symbol === 'GAS')!
    this.feeToken = this.tokens.find(token => token.symbol === 'GAS')!
    this.setNetwork(network)
  }

  setNetwork(param: PartialBy<Network, 'url'>) {
    if (param.type === 'custom') throw new Error('Custom network is not supported for NEO Legacy')

    const network = {
      type: param.type,
      url: param.url ?? DEFAULT_URL_BY_NETWORK_TYPE[param.type],
    }
    this.network = network
    this.dataService = new DoraBDSNeoLegacy(network)
    this.exchange = new CryptoCompareExchange(network)
  }

  validateAddress(address: string): boolean {
    return wallet.isAddress(address)
  }

  validateEncryptedKey(encryptedKey: string): boolean {
    return wallet.isNEP2(encryptedKey)
  }

  validateWif(wif: string): boolean {
    return wallet.isWIF(wif)
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

    const privateKey = await BsReactNativeDecrypt.decryptNeoLegacy(encryptedKey, password)
    return this.generateAccountFromWif(privateKey)
  }

  async transfer(param: TransferParam): Promise<string> {
    const apiProvider = new api.neoCli.instance(this.network.url)
    const account = new wallet.Account(param.senderAccount.wif)
    const priorityFee = param.priorityFee ?? 0

    const nativeIntents: ReturnType<typeof api.makeIntent> = []
    const nep5ScriptBuilder = new sc.ScriptBuilder()

    for (const intent of param.intents) {
      const tokenHashFixed = intent.tokenHash.replace('0x', '')

      const nativeAsset = NATIVE_ASSETS.find(asset => asset.hash === tokenHashFixed)
      if (nativeAsset) {
        nativeIntents.push(...api.makeIntent({ [nativeAsset.symbol]: intent.amount }, intent.receiverAddress))
        continue
      }

      nep5ScriptBuilder.emitAppCall(tokenHashFixed, 'transfer', [
        u.reverseHex(wallet.getScriptHashFromAddress(account.address)),
        u.reverseHex(wallet.getScriptHashFromAddress(intent.receiverAddress)),
        sc.ContractParam.integer(
          new u.Fixed8(intent.amount)
            .div(Math.pow(10, 8 - (intent.tokenDecimals ?? 8)))
            .toRawNumber()
            .toString()
        ),
      ])
    }

    let response

    if (nep5ScriptBuilder.isEmpty()) {
      response = await api.sendAsset({
        account,
        api: apiProvider,
        url: this.network.url,
        intents: nativeIntents,
        fees: priorityFee,
      })
    } else {
      console.log(nativeIntents)
      response = await api.doInvoke({
        intents: nativeIntents.length > 0 ? nativeIntents : undefined,
        account,
        api: apiProvider,
        script: nep5ScriptBuilder.str,
        url: this.network.url,
        fees: priorityFee,
      })
    }

    if (!response.tx) throw new Error('Failed to send transaction')
    return response.tx.hash
  }

  async claim(account: Account): Promise<string> {
    const neoAccount = new wallet.Account(account.wif)

    const balances = await this.dataService.getBalance(account.address)
    const neoBalance = balances.find(balance => balance.symbol === 'NEO')
    if (!neoBalance) throw new Error('It is necessary to have NEO to claim')

    const unclaimed = await this.dataService.getUnclaimed(account.address)
    if (unclaimed <= 0) throw new Error(`Doesn't have gas to claim`)

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
}
