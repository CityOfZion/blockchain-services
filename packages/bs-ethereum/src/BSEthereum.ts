import {
  Account,
  BSCalculableFee,
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
import { DEFAULT_URL_BY_NETWORK_TYPE, DERIVATION_PATH, NATIVE_ASSETS, TOKENS } from './constants'
import { BitqueryEDSEthereum } from './BitqueryEDSEthereum'
import { GhostMarketNDSEthereum } from './GhostMarketNDSEthereum'
import { RpcBDSEthereum } from './RpcBDSEthereum'
import { BitqueryBDSEthereum } from './BitqueryBDSEthereum'

export class BSEthereum<BSCustomName extends string = string>
  implements BlockchainService, BSWithNft, BSWithNameService, BSCalculableFee
{
  blockchainDataService!: BlockchainDataService
  blockchainName: BSCustomName
  feeToken: Token
  exchangeDataService!: ExchangeDataService
  tokens: Token[]
  network!: Network
  nftDataService!: NftDataService

  constructor(blockchainName: BSCustomName, network: PartialBy<Network, 'url'>) {
    this.blockchainName = blockchainName
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

    if (network.type === 'custom') {
      this.blockchainDataService = new RpcBDSEthereum(network)
    } else {
      this.blockchainDataService = new BitqueryBDSEthereum(network.type)
    }

    this.exchangeDataService = new BitqueryEDSEthereum(network.type)
    this.nftDataService = new GhostMarketNDSEthereum(network.type)
  }

  validateAddress(address: string): boolean {
    return ethers.isAddress(address)
  }

  validateEncrypted(json: string): boolean {
    return ethers.isKeystoreJson(json)
  }

  validateKey(key: string): boolean {
    try {
      if (!key.startsWith('0x')) {
        key = '0x' + key
      }
      if (ethers.dataLength(key) !== 32) return false
      return true
    } catch (error) {
      return false
    }
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return ethers.isValidName(domainName)
  }

  generateMnemonic(): string[] {
    const wallet = ethers.Wallet.createRandom()
    if (!wallet.mnemonic) throw new Error('No mnemonic found')

    return wallet.mnemonic.phrase.split(' ')
  }

  generateAccount(mnemonic: string[], index: number): Account {
    const wallet = ethers.HDNodeWallet.fromPhrase(
      mnemonic.join(' '),
      undefined,
      DERIVATION_PATH.replace('?', index.toString()),
      undefined
    )

    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
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

  async decrypt(json: string, password: string): Promise<Account> {
    const wallet = await ethers.Wallet.fromEncryptedJson(json, password)
    return {
      address: wallet.address,
      key: wallet.privateKey,
      type: 'privateKey',
    }
  }

  async transfer({ senderAccount, intent }: TransferParam): Promise<string> {
    const provider = new ethers.JsonRpcProvider(this.network.url)
    const wallet = new ethers.Wallet(senderAccount.key, provider)

    let transaction: ethers.TransactionResponse

    const isNative = NATIVE_ASSETS.some(asset => asset.hash === intent.tokenHash)
    if (!isNative) {
      ethers.parseUnits
      const abi = new ethers.Interface(['function transfer(address _to, uint256 _value) public returns (bool success)'])
      const contract = new ethers.Contract(intent.tokenHash, abi, wallet)
      const transferFunc = contract.getFunction('transfer')
      const amount = ethers.FixedNumber.fromString(intent.amount.toFixed(intent.tokenDecimals ?? 18)).value
      transaction = await transferFunc.send(intent.receiverAddress, amount)
    } else {
      transaction = await wallet.sendTransaction({
        to: intent.receiverAddress,
        value: ethers.FixedNumber.fromString(intent.amount.toFixed(intent.tokenDecimals ?? 18)).value,
      })
    }

    const transactionMined = await transaction.wait()
    if (!transactionMined) throw new Error('Transaction not mined')

    return transactionMined.hash
  }

  async calculateTransferFee({ senderAccount, intent }: TransferParam, details?: boolean | undefined): Promise<string> {
    const provider = new ethers.JsonRpcProvider(this.network.url)
    const wallet = new ethers.Wallet(senderAccount.key, provider)

    let estimated: bigint

    const isNative = NATIVE_ASSETS.some(asset => asset.hash === intent.tokenHash)
    if (!isNative) {
      const abi = new ethers.Interface(['function transfer(address _to, uint256 _value) public returns (bool success)'])
      const contract = new ethers.Contract(intent.tokenHash, abi, wallet)
      const amount = ethers.parseUnits(intent.amount.toString(), intent.tokenDecimals ?? 0)
      const transferFunc = contract.getFunction('transfer')
      estimated = await transferFunc.estimateGas(intent.receiverAddress, amount)
    } else {
      estimated = await wallet.estimateGas({
        to: intent.receiverAddress,
        value: ethers.parseEther(intent.amount.toFixed(intent.tokenDecimals ?? 0)),
      })
    }

    return ethers.formatEther(estimated)
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)
    if (!address) throw new Error('No address found for domain name')
    return address
  }
}
