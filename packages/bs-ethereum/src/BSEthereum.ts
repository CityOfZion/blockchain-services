import {
  TBSAccount,
  TIntentTransferParam,
  TBSToken,
  TTransferParam,
  TGetLedgerTransport,
  ITokenService,
  TNetwork,
  IBlockchainDataService,
  IExchangeDataService,
  INftDataService,
  IExplorerService,
  BSUtilsHelper,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersBigNumber from '@ethersproject/bignumber'
import { BSEthereumConstants } from './constants/BSEthereumConstants'
import { EthersLedgerServiceEthereum } from './services/ledger/EthersLedgerServiceEthereum'
import { BSEthereumHelper } from './helpers/BSEthereumHelper'
import { MoralisBDSEthereum } from './services/blockchain-data/MoralisBDSEthereum'
import { MoralisEDSEthereum } from './services/exchange-data/MoralisEDSEthereum'
import { GhostMarketNDSEthereum } from './services/nft-data/GhostMarketNDSEthereum'
import { BlockscoutESEthereum } from './services/explorer/BlockscoutESEthereum'
import { TokenServiceEthereum } from './services/token/TokenServiceEthereum'
import { IBSEthereum, TBSEthereumNetworkId, TSupportedEVM } from './types'

export class BSEthereum<N extends string = string, A extends string = TBSEthereumNetworkId>
  implements IBSEthereum<N, A>
{
  readonly name: N
  readonly evm: TSupportedEVM
  readonly bip44DerivationPath: string

  readonly isMultiTransferSupported = false
  readonly isCustomNetworkSupported = false

  tokens!: TBSToken[]
  nativeTokens!: TBSToken[]
  feeToken!: TBSToken

  network!: TNetwork<A>
  readonly defaultNetwork: TNetwork<A>
  readonly availableNetworks: TNetwork<A>[]

  blockchainDataService!: IBlockchainDataService
  exchangeDataService!: IExchangeDataService
  ledgerService: EthersLedgerServiceEthereum<N>
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService

  constructor(name: N, evm?: TSupportedEVM, network?: TNetwork<A>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new EthersLedgerServiceEthereum(this, getLedgerTransport)
    this.bip44DerivationPath = BSEthereumConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.evm = evm ?? 'ethereum'

    this.availableNetworks = BSEthereumConstants.NETWORKS_BY_EVM[this.evm] as TNetwork<A>[]
    this.defaultNetwork = this.availableNetworks.find(network => network.type === 'mainnet')! as TNetwork<A>

    this.setNetwork(network ?? this.defaultNetwork)
  }

  async #buildTransferParams(intent: TIntentTransferParam) {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    let decimals = intent.tokenDecimals
    if (!decimals) {
      try {
        const token = await this.blockchainDataService.getTokenInfo(intent.tokenHash)
        decimals = token.decimals
      } catch (error) {
        decimals = 18
      }
    }

    const amount = ethersBigNumber.parseFixed(intent.amount, decimals)

    const gasPrice = await provider.getGasPrice()

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      type: 2,
    }

    const isNative = this.tokenService.predicateByHash(this.feeToken, intent.tokenHash)

    if (isNative) {
      transactionParams.to = intent.receiverAddress
      transactionParams.value = amount
    } else {
      const contract = new ethers.Contract(intent.tokenHash, [
        'function transfer(address to, uint amount) returns (bool)',
      ])
      const populatedTransaction = await contract.populateTransaction.transfer(intent.receiverAddress, amount)
      transactionParams = {
        ...populatedTransaction,
        ...transactionParams,
      }
    }

    return {
      transactionParams,
      gasPrice,
    }
  }

  #setTokens(network: TNetwork<A>) {
    const nativeAsset = BSEthereumHelper.getNativeAsset(network)
    this.tokens = [nativeAsset]
    this.nativeTokens = [nativeAsset]
    this.feeToken = nativeAsset
  }

  async generateSigner(account: TBSAccount<N>): Promise<ethers.Signer> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    if (account.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (typeof account.bip44Path !== 'string') throw new Error('Your account must have bip44 path to use Ledger')

      const ledgerTransport = await this.ledgerService.getLedgerTransport(account)
      return this.ledgerService.getSigner(ledgerTransport, account.bip44Path, provider)
    }

    return new ethers.Wallet(account.key, provider)
  }

  async testNetwork(network: TNetwork<A>) {
    this.tokenService = new TokenServiceEthereum()
    const service = new BSEthereum(this.name, this.evm, network, this.ledgerService.getLedgerTransport)
    const blockchainDataServiceClone = new MoralisBDSEthereum(service)

    await blockchainDataServiceClone.getBlockHeight()
  }

  setNetwork(network: TNetwork<A>) {
    const isValidNetwork = this.availableNetworks.some(networkItem => BSUtilsHelper.isEqual(networkItem, network))
    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.#setTokens(network)

    this.network = network
    this.nftDataService = new GhostMarketNDSEthereum(this)
    this.explorerService = new BlockscoutESEthereum(this)
    this.exchangeDataService = new MoralisEDSEthereum(this)
    this.blockchainDataService = new MoralisBDSEthereum(this)
    this.tokenService = new TokenServiceEthereum()
  }

  validateAddress(address: string): boolean {
    return ethers.utils.isAddress(address)
  }

  validateEncrypted(json: string): boolean {
    return ethersJsonWallets.isCrowdsaleWallet(json) || ethersJsonWallets.isKeystoreWallet(json)
  }

  validateKey(key: string): boolean {
    try {
      if (!key.startsWith('0x')) {
        key = '0x' + key
      }

      return ethersBytes.hexDataLength(key) === 32
    } catch (error) {
      return false
    }
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.eth')
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): TBSAccount<N> {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const hd = ethers.utils.HDNode.fromMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic).derivePath(
      bip44Path
    )

    return {
      address: hd.address,
      key: hd.privateKey,
      type: 'privateKey',
      bip44Path,
      blockchain: this.name,
    }
  }

  generateAccountFromKey(key: string): TBSAccount<N> {
    const wallet = new ethers.Wallet(key)

    return {
      address: wallet.address,
      key,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
    const address = ethers.utils.computeAddress(publicKey)
    return {
      address,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async decrypt(json: string, password: string): Promise<TBSAccount<N>> {
    const wallet = await ethers.Wallet.fromEncryptedJson(json, password)
    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  async encrypt(key: string, password: string): Promise<string> {
    const wallet = new ethers.Wallet(key)
    return wallet.encrypt(password)
  }

  async transfer(param: TTransferParam<N>): Promise<string[]> {
    const signer = await this.generateSigner(param.senderAccount)

    const sentTransactionHashes: string[] = []
    let error: Error | undefined

    for (const intent of param.intents) {
      let transactionHash = ''

      try {
        const { transactionParams, gasPrice } = await this.#buildTransferParams(intent)

        let gasLimit: ethers.BigNumberish
        try {
          gasLimit = await signer.estimateGas(transactionParams)
        } catch {
          gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
        }

        const transaction = await signer.sendTransaction({
          ...transactionParams,
          gasLimit,
          maxPriorityFeePerGas: gasPrice,
          maxFeePerGas: gasPrice,
        })

        transactionHash = transaction.hash
      } catch (err: any) {
        error = err
      }

      sentTransactionHashes.push(transactionHash)
    }

    if (error && sentTransactionHashes.every(hash => !hash)) {
      throw error
    }

    return sentTransactionHashes
  }

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
    const signer = await this.generateSigner(param.senderAccount)

    let fee = ethers.utils.parseEther('0')

    for (const intent of param.intents) {
      const { gasPrice, transactionParams } = await this.#buildTransferParams(intent)
      const estimated = await signer.estimateGas(transactionParams)
      const intentFee = gasPrice.mul(estimated)

      fee = fee.add(intentFee)
    }

    return ethers.utils.formatEther(fee)
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)
    if (!address) throw new Error('No address found for domain name')
    return address
  }
}
