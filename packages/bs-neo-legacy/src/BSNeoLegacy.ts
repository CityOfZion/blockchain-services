import {
  Account,
  BDSClaimable,
  BlockchainDataService,
  BlockchainService,
  BSClaimable,
  ExchangeDataService,
  Token,
  Network,
  PartialBy,
  TransferParam,
  AccountWithDerivationPath,
  BSWithExplorerService,
  ExplorerService,
} from '@cityofzion/blockchain-service'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import {
  DEFAULT_URL_BY_NETWORK_TYPE,
  DERIVATION_PATH,
  LEGACY_NETWORK_BY_NETWORK_TYPE,
  NATIVE_ASSETS,
  TOKENS,
} from './constants'
import { DoraBDSNeoLegacy } from './DoraBDSNeoLegacy'
import { CryptoCompareEDSNeoLegacy } from './CryptoCompareEDSNeoLegacy'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { DoraESNeoLegacy } from './DoraESNeoLegacy'

export class BSNeoLegacy<BSCustomName extends string = string>
  implements BlockchainService, BSClaimable, BSWithExplorerService {
  readonly blockchainName: BSCustomName
  readonly feeToken: Token
  readonly claimToken: Token
  readonly burnToken: Token
  readonly derivationPath: string

  blockchainDataService!: BlockchainDataService & BDSClaimable
  exchangeDataService!: ExchangeDataService
  explorerService!: ExplorerService
  tokens: Token[]
  network!: Network
  legacyNetwork: string

  constructor(blockchainName: BSCustomName, network: PartialBy<Network, 'url'>) {
    if (network.type === 'custom') throw new Error('Custom network is not supported for NEO Legacy')

    this.blockchainName = blockchainName
    this.legacyNetwork = LEGACY_NETWORK_BY_NETWORK_TYPE[network.type]
    this.derivationPath = DERIVATION_PATH
    this.tokens = TOKENS[network.type]
    this.claimToken = this.tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = this.tokens.find(token => token.symbol === 'NEO')!
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
    this.blockchainDataService = new DoraBDSNeoLegacy(network, this.feeToken, this.claimToken)
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(network.type)
    this.explorerService = new DoraESNeoLegacy(network.type)
  }

  validateAddress(address: string): boolean {
    return wallet.isAddress(address)
  }

  validateEncrypted(key: string): boolean {
    return wallet.isNEP2(key)
  }

  validateKey(key: string): boolean {
    return wallet.isWIF(key) || wallet.isPrivateKey(key)
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): AccountWithDerivationPath {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const path = this.derivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', derivationPath: path }
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

    const privateKey = await BsReactNativeDecrypt.decryptNeoLegacy(encryptedKey, password)
    return this.generateAccountFromKey(privateKey)
  }

  encrypt(key: string, password: string): Promise<string> {
    return wallet.encrypt(key, password)
  }

  async transfer({ intent: transferIntent, senderAccount, tipIntent, ...params }: TransferParam): Promise<string> {
    const apiProvider = new api.neoCli.instance(this.network.url)
    const account = new wallet.Account(senderAccount.key)
    const priorityFee = Number(params.priorityFee ?? 0)

    const nativeIntents: ReturnType<typeof api.makeIntent> = []
    const nep5ScriptBuilder = new sc.ScriptBuilder()

    const intents = [transferIntent, ...(tipIntent ? [tipIntent] : [])]

    for (const intent of intents) {
      const tokenHashFixed = intent.tokenHash.replace('0x', '')

      const nativeAsset = NATIVE_ASSETS.find(asset => asset.hash === tokenHashFixed)
      if (nativeAsset) {
        nativeIntents.push(...api.makeIntent({ [nativeAsset.symbol]: Number(intent.amount) }, intent.receiverAddress))
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
    const neoAccount = new wallet.Account(account.key)

    const balances = await this.blockchainDataService.getBalance(account.address)
    const neoBalance = balances.find(balance => balance.token.symbol === 'NEO')
    if (!neoBalance) throw new Error('It is necessary to have NEO to claim')

    const unclaimed = await this.blockchainDataService.getUnclaimed(account.address)
    if (Number(unclaimed) <= 0) throw new Error(`Doesn't have gas to claim`)

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
