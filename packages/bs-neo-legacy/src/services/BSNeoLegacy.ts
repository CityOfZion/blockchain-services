import {
  Account,
  BDSClaimable,
  BlockchainDataService,
  BlockchainService,
  BSClaimable,
  ExchangeDataService,
  Token,
  Network,
  TransferParam,
  BSWithExplorerService,
  ExplorerService,
} from '@cityofzion/blockchain-service'
import { api, sc, u, wallet } from '@cityofzion/neon-js'
import { keychain } from '@cityofzion/bs-asteroid-sdk'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../helpers/BSNeoLegacyHelper'
import { CryptoCompareEDSNeoLegacy } from './exchange-data/CryptoCompareEDSNeoLegacy'
import { DoraBDSNeoLegacy } from './blockchain-data/DoraBDSNeoLegacy'
import { NeoTubeESNeoLegacy } from './explorer/NeoTubeESNeoLegacy'

export class BSNeoLegacy<BSName extends string = string>
  implements BlockchainService<BSName, BSNeoLegacyNetworkId>, BSClaimable<BSName>, BSWithExplorerService
{
  readonly name: BSName
  readonly bip44DerivationPath: string

  feeToken!: Token
  claimToken!: Token
  burnToken!: Token

  blockchainDataService!: BlockchainDataService & BDSClaimable
  exchangeDataService!: ExchangeDataService
  explorerService!: ExplorerService
  tokens!: Token[]
  network!: Network<BSNeoLegacyNetworkId>
  legacyNetwork: string

  constructor(name: BSName, network?: Network<BSNeoLegacyNetworkId>) {
    network = network ?? BSNeoLegacyConstants.DEFAULT_NETWORK

    this.name = name
    this.legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    this.bip44DerivationPath = BSNeoLegacyConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.setNetwork(network)
  }

  #setTokens(network: Network<BSNeoLegacyNetworkId>) {
    const tokens = BSNeoLegacyHelper.getTokens(network)

    this.tokens = tokens
    this.feeToken = tokens.find(token => token.symbol === 'GAS')!
    this.burnToken = tokens.find(token => token.symbol === 'NEO')!
    this.claimToken = tokens.find(token => token.symbol === 'GAS')!
  }

  async testNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const blockchainDataServiceClone = new DoraBDSNeoLegacy(network, this.feeToken, this.claimToken, this.tokens)

    await blockchainDataServiceClone.getBlockHeight()
  }

  setNetwork(network: Network<BSNeoLegacyNetworkId>) {
    if (!BSNeoLegacyConstants.ALL_NETWORK_IDS.includes(network.id)) throw new Error('Custom network is not supported')

    this.#setTokens(network)

    this.network = network
    this.blockchainDataService = new DoraBDSNeoLegacy(network, this.feeToken, this.claimToken, this.tokens)
    this.exchangeDataService = new CryptoCompareEDSNeoLegacy(network)
    this.explorerService = new NeoTubeESNeoLegacy(network)
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

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Account<BSName> {
    keychain.importMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const childKey = keychain.generateChildKey('neo', bip44Path)
    const key = childKey.getWIF()
    const { address } = new wallet.Account(key)
    return { address, key, type: 'wif', bip44Path, blockchain: this.name }
  }

  generateAccountFromKey(key: string): Account<BSName> {
    const type = wallet.isWIF(key) ? 'wif' : wallet.isPrivateKey(key) ? 'privateKey' : undefined
    if (!type) throw new Error('Invalid key')

    const { address } = new wallet.Account(key)
    return { address, key, type, blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<Account<BSName>> {
    const key = await wallet.decrypt(encryptedKey, password)
    return this.generateAccountFromKey(key)
  }

  encrypt(key: string, password: string): Promise<string> {
    return wallet.encrypt(key, password)
  }

  async transfer({ intents, senderAccount, tipIntent, ...params }: TransferParam): Promise<string[]> {
    const apiProvider = new api.neoCli.instance(this.network.url)
    const account = new wallet.Account(senderAccount.key)
    const priorityFee = Number(params.priorityFee ?? 0)

    const nativeIntents: ReturnType<typeof api.makeIntent> = []
    const nep5ScriptBuilder = new sc.ScriptBuilder()

    const concatIntents = [...intents, ...(tipIntent ? [tipIntent] : [])]

    for (const intent of concatIntents) {
      const tokenHashFixed = BSNeoLegacyHelper.normalizeHash(intent.tokenHash)

      const nativeAsset = BSNeoLegacyConstants.NATIVE_ASSETS.find(
        asset => BSNeoLegacyHelper.normalizeHash(asset.hash) === tokenHashFixed
      )
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

    let response: any

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

    return intents.map(() => response.tx!.hash)
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
