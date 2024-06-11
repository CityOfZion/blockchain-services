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
  PartialBy,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersBigNumber from '@ethersproject/bignumber'
import { DEFAULT_URL_BY_NETWORK_TYPE, DERIVATION_PATH, NATIVE_ASSETS, TOKENS } from './constants'
import { BitqueryEDSEthereum } from './BitqueryEDSEthereum'
import { GhostMarketNDSEthereum } from './GhostMarketNDSEthereum'
import { RpcBDSEthereum } from './RpcBDSEthereum'
import { BitqueryBDSEthereum } from './BitqueryBDSEthereum'
import { LedgerServiceEthereum } from './LedgerServiceEthereum'
import Transport from '@ledgerhq/hw-transport'
export class BSEthereum<BSCustomName extends string = string>
  implements BlockchainService, BSWithNft, BSWithNameService, BSCalculableFee, BSWithLedger
{
  readonly blockchainName: BSCustomName
  readonly feeToken: Token
  readonly derivationPath: string

  blockchainDataService!: BlockchainDataService
  exchangeDataService!: ExchangeDataService
  ledgerService: LedgerServiceEthereum
  tokens: Token[]
  nftDataService!: NftDataService
  network!: Network

  constructor(
    blockchainName: BSCustomName,
    network: PartialBy<Network, 'url'>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    this.blockchainName = blockchainName
    this.ledgerService = new LedgerServiceEthereum(getLedgerTransport)
    this.derivationPath = DERIVATION_PATH
    this.tokens = TOKENS[network.type]

    this.feeToken = this.tokens.find(token => token.symbol === 'ETH')!
    this.setNetwork(network)
  }

  setNetwork(param: PartialBy<Network, 'url'>) {
    const network = {
      type: param.type,
      url: param.url ?? DEFAULT_URL_BY_NETWORK_TYPE[param.type],
    }
    this.network = network

    if (network.type !== 'mainnet') {
      this.blockchainDataService = new RpcBDSEthereum(network)
    } else {
      this.blockchainDataService = new BitqueryBDSEthereum(network)
    }

    this.exchangeDataService = new BitqueryEDSEthereum(network.type)
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

    let signTransactionFunction: (transaction: ethers.providers.TransactionRequest) => Promise<string>
    if (ledgerTransport) {
      signTransactionFunction = await this.ledgerService.getSignTransactionFunction(ledgerTransport)
    } else {
      const wallet = new ethers.Wallet(param.senderAccount.key, provider)
      signTransactionFunction = wallet.signTransaction.bind(wallet)
    }

    const decimals = param.intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(param.intent.amount, decimals)

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest>

    const isNative = NATIVE_ASSETS.some(asset => asset.hash === param.intent.tokenHash)
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

    const voidSigner = new ethers.VoidSigner(param.senderAccount.address, provider)
    const transaction = await voidSigner.populateTransaction(transactionParams)

    const signedTransaction = await signTransactionFunction(transaction)
    const transactionResponse = await provider.sendTransaction(signedTransaction)
    return transactionResponse.hash
  }

  async calculateTransferFee({ intent }: TransferParam): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(this.network.url)

    const gasPrice = await provider.getGasPrice()

    let estimated: ethers.BigNumber

    const isNative = NATIVE_ASSETS.some(asset => asset.hash === intent.tokenHash)
    const decimals = intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(intent.amount, decimals)

    if (!isNative) {
      const contract = new ethers.Contract(
        intent.tokenHash,
        ['function transfer(address to, uint amount) returns (bool)'],
        provider
      )

      estimated = await contract.estimateGas.transfer(intent.receiverAddress, amount)
    } else {
      estimated = await provider.estimateGas({
        to: intent.receiverAddress,
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
