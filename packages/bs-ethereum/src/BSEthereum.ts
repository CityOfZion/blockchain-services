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
  PartialNetwork,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersBigNumber from '@ethersproject/bignumber'
import { BitqueryEDSEthereum } from './BitqueryEDSEthereum'
import { GhostMarketNDSEthereum } from './GhostMarketNDSEthereum'
import { RpcBDSEthereum } from './RpcBDSEthereum'
import { BitqueryBDSEthereum } from './BitqueryBDSEthereum'
import { LedgerServiceEthereum, LedgerSigner } from './LedgerServiceEthereum'
import Transport from '@ledgerhq/hw-transport'
import {
  AvailableNetworkIds,
  BITQUERY_MIRROR_NETWORK_BY_NETWORK_ID,
  DEFAULT_URL_BY_NETWORK_ID,
  DERIVATION_PATH,
  NATIVE_ASSET_BY_NETWORK_ID,
  NETWORK_NAME_BY_NETWORK_ID,
} from './constants'

export class BSEthereum<BSCustomName extends string = string>
  implements
    BlockchainService<BSCustomName, AvailableNetworkIds>,
    BSWithNft,
    BSWithNameService,
    BSCalculableFee,
    BSWithLedger
{
  readonly blockchainName: BSCustomName
  readonly feeToken: Token
  readonly derivationPath: string

  blockchainDataService!: BlockchainDataService
  exchangeDataService!: ExchangeDataService
  ledgerService: LedgerServiceEthereum
  tokens: Token[]
  nftDataService!: NftDataService
  network!: Network<AvailableNetworkIds>

  constructor(
    blockchainName: BSCustomName,
    network: PartialNetwork<AvailableNetworkIds>,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    this.blockchainName = blockchainName
    this.ledgerService = new LedgerServiceEthereum(getLedgerTransport)
    this.derivationPath = DERIVATION_PATH
    this.tokens = [NATIVE_ASSET_BY_NETWORK_ID[network.id]]
    this.feeToken = NATIVE_ASSET_BY_NETWORK_ID[network.id]
    this.setNetwork(network)
  }

  setNetwork(partialNetwork: PartialNetwork<AvailableNetworkIds>) {
    const network = {
      id: partialNetwork.id,
      name: partialNetwork.name ?? NETWORK_NAME_BY_NETWORK_ID[partialNetwork.id],
      url: partialNetwork.url ?? DEFAULT_URL_BY_NETWORK_ID[partialNetwork.id],
    }
    this.network = network

    const bitqueryNetwork = BITQUERY_MIRROR_NETWORK_BY_NETWORK_ID[partialNetwork.id]

    this.blockchainDataService = bitqueryNetwork ? new BitqueryBDSEthereum(network) : new RpcBDSEthereum(network)

    this.exchangeDataService = new BitqueryEDSEthereum(network.id)
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
      signer = new LedgerSigner(ledgerTransport, provider)
    } else {
      signer = new ethers.Wallet(param.senderAccount.key, provider)
    }

    const decimals = param.intent.tokenDecimals ?? 18
    const amount = ethersBigNumber.parseFixed(param.intent.amount, decimals)

    let transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest>

    const isNative = NATIVE_ASSET_BY_NETWORK_ID[this.network.id].hash === param.intent.tokenHash
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
      signer = new LedgerSigner(ledgerTransport, provider)
    } else {
      signer = new ethers.Wallet(param.senderAccount.key, provider)
    }

    const gasPrice = await provider.getGasPrice()

    let estimated: ethers.BigNumber

    const isNative = NATIVE_ASSET_BY_NETWORK_ID[this.network.id].hash === param.intent.tokenHash
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
