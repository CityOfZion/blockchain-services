import {
  TBSAccount,
  TIntentTransferParam,
  TBSToken,
  TTransferParam,
  TGetLedgerTransport,
  ITokenService,
  TBSNetwork,
  IBlockchainDataService,
  IExchangeDataService,
  INftDataService,
  IExplorerService,
  BSUtilsHelper,
  TPingNetworkResponse,
  IWalletConnectService,
  type IFullTransactionsDataService,
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
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { WalletConnectServiceEthereum } from './services/wallet-connect/WalletConnectServiceEthereum'
import axios from 'axios'
import { MoralisFullTransactionsDataServiceEthereum } from './services/full-transactions-data/MoralisFullTransactionsDataServiceEthereum'

export class BSEthereum<N extends string = string, A extends string = TBSEthereumNetworkId>
  implements IBSEthereum<N, A>
{
  readonly name: N
  readonly bip44DerivationPath: string

  readonly isMultiTransferSupported = false
  readonly isCustomNetworkSupported = false

  tokens!: TBSToken[]
  nativeTokens!: TBSToken[]
  feeToken!: TBSToken

  network!: TBSNetwork<A>
  rpcNetworkUrls!: string[]
  readonly defaultNetwork!: TBSNetwork<A>
  readonly availableNetworks!: TBSNetwork<A>[]

  blockchainDataService!: IBlockchainDataService
  exchangeDataService!: IExchangeDataService
  ledgerService: EthersLedgerServiceEthereum<N>
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService
  walletConnectService!: IWalletConnectService
  fullTransactionsDataService!: IFullTransactionsDataService

  constructor(name: N, evm?: TSupportedEVM, network?: TBSNetwork<A>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new EthersLedgerServiceEthereum(this, getLedgerTransport)
    this.bip44DerivationPath = BSEthereumConstants.DEFAULT_BIP44_DERIVATION_PATH

    if (!evm) return

    this.availableNetworks = BSEthereumConstants.NETWORKS_BY_EVM[evm] as TBSNetwork<A>[]
    this.defaultNetwork = this.availableNetworks.find(network => network.type === 'mainnet')! as TBSNetwork<A>

    this.setNetwork(network ?? this.defaultNetwork)
  }

  protected async _buildTransferParams(intent: TIntentTransferParam) {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    const amount = ethersBigNumber.parseFixed(intent.amount, intent.token.decimals)

    const gasPrice = await provider.getGasPrice()

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      type: 2,
    }

    const isNative = this.tokenService.predicateByHash(this.feeToken, intent.token.hash)

    if (isNative) {
      transactionParams.to = intent.receiverAddress
      transactionParams.value = amount
    } else {
      const contract = new ethers.Contract(intent.token.hash, [
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

  #setTokens(network: TBSNetwork<A>) {
    const nativeAsset = BSEthereumHelper.getNativeAsset(network)
    this.tokens = [nativeAsset]
    this.nativeTokens = [nativeAsset]
    this.feeToken = nativeAsset
  }

  async generateSigner(account: TBSAccount<N>): Promise<ethers.Signer & TypedDataSigner> {
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

  setNetwork(network: TBSNetwork<A>) {
    const rpcNetworkUrls = BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, rpcNetworkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.#setTokens(network)

    this.network = network
    this.rpcNetworkUrls = rpcNetworkUrls

    this.nftDataService = new GhostMarketNDSEthereum(this)
    this.explorerService = new BlockscoutESEthereum(this)
    this.exchangeDataService = new MoralisEDSEthereum(this)
    this.blockchainDataService = new MoralisBDSEthereum(this)
    this.tokenService = new TokenServiceEthereum()
    this.walletConnectService = new WalletConnectServiceEthereum(this)
    this.fullTransactionsDataService = new MoralisFullTransactionsDataServiceEthereum(this)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNode(url: string): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()

    const response = await axios.post(
      url,
      { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1234 },
      { timeout: 5000, signal: abortController.signal }
    )

    clearTimeout(timeout)

    const latency = Date.now() - timeStart

    return {
      latency,
      url,
      height: ethers.BigNumber.from(response.data.result).toNumber(),
    }
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
    } catch {
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
        const { transactionParams, gasPrice } = await this._buildTransferParams(intent)

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
        if (!error) error = err
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
      const { gasPrice, transactionParams } = await this._buildTransferParams(intent)
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
