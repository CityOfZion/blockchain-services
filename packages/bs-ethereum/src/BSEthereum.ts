import {
  Account,
  AccountWithDerivationPath,
  BSCalculableFee,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  BlockchainDataService,
  BlockchainService,
  ExchangeDataService,
  Network,
  NftDataService,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersBigNumber from '@ethersproject/bignumber'
import { GhostMarketNDSEthereum } from './GhostMarketNDSEthereum'
import { EthersLedgerServiceEthereum } from './EthersLedgerServiceEthereum'
import Transport from '@ledgerhq/hw-transport'
import { BSEthereumNetworkId, BSEthereumHelper } from './BSEthereumHelper'
import { MoralisBDSEthereum } from './MoralisBDSEthereum'
import { MoralisEDSEthereum } from './MoralisEDSEthereum'

export class BSEthereum<BSCustomName extends string = string>
  implements
    BlockchainService<BSCustomName, BSEthereumNetworkId>,
    BSWithNft,
    BSWithNameService,
    BSCalculableFee,
    BSWithLedger
{
  readonly blockchainName: BSCustomName
  readonly derivationPath: string

  feeToken!: Token
  blockchainDataService!: BlockchainDataService
  exchangeDataService!: ExchangeDataService
  ledgerService: EthersLedgerServiceEthereum
  tokens!: Token[]
  nftDataService!: NftDataService
  network!: Network<BSEthereumNetworkId>

  constructor(
    blockchainName: BSCustomName,
    network?: Network<BSEthereumNetworkId>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    network = network ?? BSEthereumHelper.DEFAULT_NETWORK

    this.blockchainName = blockchainName
    this.ledgerService = new EthersLedgerServiceEthereum(getLedgerTransport)
    this.derivationPath = BSEthereumHelper.DERIVATION_PATH

    this.setNetwork(network)
  }

  #setTokens(network: Network<BSEthereumNetworkId>) {
    const nativeAsset = BSEthereumHelper.getNativeAsset(network)
    this.tokens = [nativeAsset]
    this.feeToken = nativeAsset
  }

  setNetwork(network: Network<BSEthereumNetworkId>) {
    this.#setTokens(network)

    this.network = network

    this.blockchainDataService = new MoralisBDSEthereum(network)
    this.exchangeDataService = new MoralisEDSEthereum(network, this.blockchainDataService)
    this.nftDataService = new GhostMarketNDSEthereum(network)
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

  generateAccountFromMnemonic(mnemonic: string[] | string, index: number): AccountWithDerivationPath {
    const path = this.derivationPath.replace('?', index.toString())
    const wallet = ethers.Wallet.fromMnemonic(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic, path)

    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
      derivationPath: path,
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
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    let ledgerTransport: Transport | undefined

    if (param.isLedger) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')
      ledgerTransport = await this.ledgerService.getLedgerTransport(param.senderAccount)
    }

    let signer: ethers.Signer
    if (ledgerTransport) {
      signer = this.ledgerService.getSigner(ledgerTransport, provider)
    } else {
      signer = new ethers.Wallet(param.senderAccount.key, provider)
    }

    const decimals = param.intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(param.intent.amount, decimals)

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest>

    const isNative = this.feeToken.hash === param.intent.tokenHash
    if (isNative) {
      transactionParams = {
        to: param.intent.receiverAddress,
        value: amount,
      }
    } else {
      const contract = new ethers.Contract(param.intent.tokenHash, [
        'function transfer(address to, uint amount) returns (bool)',
      ])
      transactionParams = await contract.populateTransaction.transfer(param.intent.receiverAddress, amount)
    }

    const transaction = await signer.sendTransaction(transactionParams)

    return transaction.hash
  }

  async calculateTransferFee(param: TransferParam): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    let ledgerTransport: Transport | undefined

    if (param.isLedger) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')
      ledgerTransport = await this.ledgerService.getLedgerTransport(param.senderAccount)
    }

    let signer: ethers.Signer
    if (ledgerTransport) {
      signer = this.ledgerService.getSigner(ledgerTransport, provider)
    } else {
      signer = new ethers.Wallet(param.senderAccount.key, provider)
    }

    const gasPrice = await provider.getGasPrice()

    let estimated: ethers.BigNumber

    const isNative = this.feeToken.hash === param.intent.tokenHash
    const decimals = param.intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(param.intent.amount, decimals)

    if (!isNative) {
      const contract = new ethers.Contract(
        param.intent.tokenHash,
        ['function transfer(address to, uint amount) returns (bool)'],
        signer
      )

      estimated = await contract.estimateGas.transfer(param.intent.receiverAddress, amount)
    } else {
      estimated = await signer.estimateGas({
        to: param.intent.receiverAddress,
        value: amount,
      })
    }

    return ethers.utils.formatEther(gasPrice.mul(estimated))
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)
    if (!address) throw new Error('No address found for domain name')
    return address
  }
}
