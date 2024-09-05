import {
  Account,
  BSCalculableFee,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  BlockchainDataService,
  BlockchainService,
  ExchangeDataService,
  ExplorerService,
  Network,
  NftDataService,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersBigNumber from '@ethersproject/bignumber'
import { BSEthereumConstants, BSEthereumNetworkId } from './constants/BSEthereumConstants'
import { EthersLedgerServiceEthereum } from './services/ledger/EthersLedgerServiceEthereum'
import Transport from '@ledgerhq/hw-transport'
import { BSEthereumHelper } from './helpers/BSEthereumHelper'
import { BlockscoutBDSEthereum } from './services/blockchain-data/BlockscoutBDSEthereum'
import { BlockscoutEDSEthereum } from './services/exchange-data/BlockscoutEDSEthereum'
import { MoralisBDSEthereum } from './services/blockchain-data/MoralisBDSEthereum'
import { MoralisEDSEthereum } from './services/exchange-data/MoralisEDSEthereum'
import { GhostMarketNDSEthereum } from './services/nft-data/GhostMarketNDSEthereum'
import { BlockscoutESEthereum } from './services/explorer/BlockscoutESEthereum'

export class BSEthereum<BSCustomName extends string = string>
  implements
    BlockchainService<BSCustomName, BSEthereumNetworkId>,
    BSWithNft,
    BSWithNameService,
    BSCalculableFee,
    BSWithLedger,
    BSWithExplorerService
{
  readonly blockchainName: BSCustomName
  readonly bip44DerivationPath: string

  feeToken!: Token
  blockchainDataService!: BlockchainDataService
  exchangeDataService!: ExchangeDataService
  ledgerService: EthersLedgerServiceEthereum
  tokens!: Token[]
  nftDataService!: NftDataService
  network!: Network<BSEthereumNetworkId>
  explorerService!: ExplorerService

  constructor(
    blockchainName: BSCustomName,
    network?: Network<BSEthereumNetworkId>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    network = network ?? BSEthereumConstants.DEFAULT_NETWORK

    this.blockchainName = blockchainName
    this.ledgerService = new EthersLedgerServiceEthereum(this, getLedgerTransport)
    this.bip44DerivationPath = BSEthereumConstants.DEFAULT_BIP44_DERIVATION_PATH

    this.setNetwork(network)
  }

  async #generateSigner(account: Account, isLedger?: boolean): Promise<ethers.Signer> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    if (isLedger) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (typeof account.bip44Path !== 'string') throw new Error('Your account must have bip44 path to use Ledger')

      const ledgerTransport = await this.ledgerService.getLedgerTransport(account)
      return this.ledgerService.getSigner(ledgerTransport, account.bip44Path, provider)
    }

    return new ethers.Wallet(account.key, provider)
  }

  async #buildTransferParams(param: TransferParam) {
    const signer = await this.#generateSigner(param.senderAccount, param.isLedger)
    if (!signer.provider) throw new Error('Signer must have provider')

    const decimals = param.intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(param.intent.amount, decimals)

    const gasPrice = await signer.provider.getGasPrice()

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      type: 2,
    }

    const isNative =
      BSEthereumHelper.normalizeHash(this.feeToken.hash) === BSEthereumHelper.normalizeHash(param.intent.tokenHash)
    if (isNative) {
      transactionParams.to = param.intent.receiverAddress
      transactionParams.value = amount
    } else {
      const contract = new ethers.Contract(param.intent.tokenHash, [
        'function transfer(address to, uint amount) returns (bool)',
      ])
      const populatedTransaction = await contract.populateTransaction.transfer(param.intent.receiverAddress, amount)
      transactionParams = {
        ...populatedTransaction,
        ...transactionParams,
      }
    }

    return {
      transactionParams,
      signer,
      gasPrice,
    }
  }

  #setTokens(network: Network<BSEthereumNetworkId>) {
    const nativeAsset = BSEthereumHelper.getNativeAsset(network)
    this.tokens = [nativeAsset]
    this.feeToken = nativeAsset
  }

  setNetwork(network: Network<BSEthereumNetworkId>) {
    this.#setTokens(network)

    this.network = network

    if (BlockscoutBDSEthereum.isSupported(network)) {
      this.exchangeDataService = new BlockscoutEDSEthereum(network)
      this.blockchainDataService = new BlockscoutBDSEthereum(network)
    } else {
      this.exchangeDataService = new MoralisEDSEthereum(network, this.blockchainDataService)
      this.blockchainDataService = new MoralisBDSEthereum(network)
    }

    this.nftDataService = new GhostMarketNDSEthereum(network)
    this.explorerService = new BlockscoutESEthereum(network)
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
      if (ethersBytes.hexDataLength(key) !== 32) return false

      return true
    } catch (error) {
      return false
    }
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    if (!domainName.endsWith('.eth')) return false
    return true
  }

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Account {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())
    const wallet = ethers.Wallet.fromMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic, bip44Path)

    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
      bip44Path,
    }
  }

  generateAccountFromKey(key: string): Account {
    const wallet = new ethers.Wallet(key)

    return {
      address: wallet.address,
      key,
      type: 'privateKey',
    }
  }

  generateAccountFromPublicKey(publicKey: string): Account {
    const address = ethers.utils.computeAddress(publicKey)
    return {
      address,
      key: publicKey,
      type: 'publicKey',
    }
  }

  async decrypt(json: string, password: string): Promise<Account> {
    const wallet = await ethers.Wallet.fromEncryptedJson(json, password)
    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
    }
  }

  async encrypt(key: string, password: string): Promise<string> {
    const wallet = new ethers.Wallet(key)
    return wallet.encrypt(password)
  }

  async transfer(param: TransferParam): Promise<string> {
    const { signer, transactionParams, gasPrice } = await this.#buildTransferParams(param)

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

    return transaction.hash
  }

  async calculateTransferFee(param: TransferParam): Promise<string> {
    const { signer, transactionParams, gasPrice } = await this.#buildTransferParams(param)
    const estimated = await signer.estimateGas(transactionParams)
    return ethers.utils.formatEther(gasPrice.mul(estimated))
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)
    if (!address) throw new Error('No address found for domain name')
    return address
  }
}
