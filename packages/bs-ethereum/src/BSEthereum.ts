import {
  BSKeychainHelper,
  BSUtilsHelper,
  type TBSAccount,
  type TTransferIntent,
  type TBSToken,
  type TTransferParams,
  type TGetLedgerTransport,
  type ITokenService,
  type TBSNetwork,
  type IBlockchainDataService,
  type IExchangeDataService,
  type INftDataService,
  type IExplorerService,
  type TPingNetworkResponse,
  type IFullTransactionsDataService,
  type TTransactionDefault,
  type TBSNetworkId,
  BSBigUnitAmount,
  BSBigHumanAmount,
  BSBigNumber,
} from '@cityofzion/blockchain-service'
import { ethers, computeAddress, isAddress, type TransactionRequest, JsonRpcProvider, type Signer } from 'ethers'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import * as ethersBytes from '@ethersproject/bytes'
import { BSEthereumConstants } from './constants/BSEthereumConstants'
import { EthersLedgerServiceEthereum } from './services/ledger/EthersLedgerServiceEthereum'
import { BSEthereumHelper } from './helpers/BSEthereumHelper'
import { MoralisBDSEthereum } from './services/blockchain-data/MoralisBDSEthereum'
import { MoralisEDSEthereum } from './services/exchange-data/MoralisEDSEthereum'
import { MoralisNDSEthereum } from './services/nft-data/MoralisNDSEthereum'
import { BlockscoutESEthereum } from './services/explorer/BlockscoutESEthereum'
import { TokenServiceEthereum } from './services/token/TokenServiceEthereum'
import type { IBSEthereum, TBSEthereumName, TBSEthereumNetworkId } from './types'
import { WalletConnectServiceEthereum } from './services/wallet-connect/WalletConnectServiceEthereum'
import axios from 'axios'
import { MoralisFullTransactionsDataServiceEthereum } from './services/full-transactions-data/MoralisFullTransactionsDataServiceEthereum'

export class BSEthereum<
  N extends string = TBSEthereumName,
  A extends TBSNetworkId = TBSEthereumNetworkId,
> implements IBSEthereum<N, A> {
  readonly name: N
  readonly bipDerivationPath: string

  readonly isMultiTransferSupported = false
  readonly isCustomNetworkSupported = false

  tokens!: TBSToken[]
  nativeTokens!: TBSToken[]
  feeToken!: TBSToken

  network!: TBSNetwork<A>
  networkUrls!: string[]
  readonly defaultNetwork!: TBSNetwork<A>
  readonly availableNetworks!: TBSNetwork<A>[]

  blockchainDataService!: IBlockchainDataService<N>
  exchangeDataService!: IExchangeDataService
  ledgerService: EthersLedgerServiceEthereum<N>
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService
  walletConnectService!: WalletConnectServiceEthereum<N, A>
  fullTransactionsDataService!: IFullTransactionsDataService<N>

  constructor(name: N, network?: TBSNetwork<A>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.name = name
    this.ledgerService = new EthersLedgerServiceEthereum(this, getLedgerTransport)
    this.bipDerivationPath = BSEthereumConstants.DEFAULT_BIP_DERIVATION_PATH

    const networks = (BSEthereumConstants.NETWORKS_BY_EVM as any)[name]
    // This case is hit when the user tries to initialize the service with a custom network that is not in our predefined list. We want to allow that, but in that case we won't have the default network and available networks list.
    if (!networks || !networks.length) {
      return
    }

    this.availableNetworks = networks as TBSNetwork<A>[]
    this.defaultNetwork = this.availableNetworks.find(network => network.type === 'mainnet')! as TBSNetwork<A>

    this.setNetwork(network ?? this.defaultNetwork)
  }

  async _getSigner(account: TBSAccount<N>): Promise<Signer> {
    const provider = new JsonRpcProvider(this.network.url)

    if (account.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (!account.bipPath) {
        throw new Error('Account must have BIP path to use Ledger')
      }

      const ledgerTransport = await this.ledgerService.getLedgerTransport(account)

      return this.ledgerService.getSigner(ledgerTransport, account.bipPath, provider)
    }

    return new ethers.Wallet(account.key, provider)
  }

  async _buildTransferParams(intent: TTransferIntent) {
    const provider = new JsonRpcProvider(this.network.url)
    const amount = new BSBigHumanAmount(intent.amount, intent.token.decimals).toUnit().toString()
    const { gasPrice } = await provider.getFeeData()
    const gasPriceBn = new BSBigUnitAmount(gasPrice?.toString() || '0', BSEthereumConstants.DEFAULT_DECIMALS)

    let transactionParams: TransactionRequest = {
      type: 2,
      chainId: parseInt(this.network.id),
    }

    const isNative = this.tokenService.predicateByHash(this.feeToken, intent.token.hash)

    if (isNative) {
      transactionParams.to = intent.receiverAddress
      transactionParams.value = amount
    } else {
      const contract = new ethers.Contract(intent.token.hash, [
        'function transfer(address to, uint amount) returns (bool)',
      ])
      const populatedTransaction = await contract.transfer.populateTransaction(intent.receiverAddress, amount)
      transactionParams = {
        ...populatedTransaction,
        ...transactionParams,
      }
    }

    return {
      transactionParams,
      gasPriceBn,
    }
  }

  _setTokens(network: TBSNetwork<A>) {
    const nativeAsset = BSEthereumHelper.getNativeAsset(network)
    this.tokens = [nativeAsset]
    this.nativeTokens = [nativeAsset]
    this.feeToken = nativeAsset
  }

  setNetwork(network: TBSNetwork<A>) {
    const networkUrls = BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this._setTokens(network)

    this.network = network
    this.networkUrls = networkUrls

    this.nftDataService = new MoralisNDSEthereum(this)
    this.explorerService = new BlockscoutESEthereum(this)
    this.exchangeDataService = new MoralisEDSEthereum(this)
    this.blockchainDataService = new MoralisBDSEthereum(this)
    this.tokenService = new TokenServiceEthereum(this)
    this.walletConnectService = new WalletConnectServiceEthereum(this)
    this.fullTransactionsDataService = new MoralisFullTransactionsDataServiceEthereum(this)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNetwork(url: string): Promise<TPingNetworkResponse> {
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
      height: BSBigNumber.ensureNumber(response.data.result),
    }
  }

  validateAddress(address: string): boolean {
    return isAddress(address)
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

  async generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Promise<TBSAccount<N>> {
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const ethersMnemonic = ethers.Mnemonic.fromPhrase(Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic)
    const hd = ethers.HDNodeWallet.fromMnemonic(ethersMnemonic, bipPath)

    return {
      address: hd.address,
      key: hd.privateKey,
      type: 'privateKey',
      bipPath,
      blockchain: this.name,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<N>> {
    const wallet = new ethers.Wallet(key)

    return {
      address: wallet.address,
      key,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<N>> {
    const address = computeAddress(publicKey)

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

  async transfer({ senderAccount, intents }: TTransferParams<N>): Promise<TTransactionDefault<N>[]> {
    const signer = await this._getSigner(senderAccount)

    const { address } = senderAccount
    const addressUrl = this.explorerService.buildAddressUrl(address)
    const transactions: TTransactionDefault<N>[] = []
    let error: Error | undefined
    let nonce = await signer.getNonce('pending')

    for (const intent of intents) {
      try {
        const { transactionParams, gasPriceBn } = await this._buildTransferParams(intent)

        transactionParams.nonce = nonce++

        let gasLimitBn: BSBigUnitAmount
        try {
          const estimatedGas = await signer.estimateGas(transactionParams)
          gasLimitBn = new BSBigUnitAmount(estimatedGas.toString(), BSEthereumConstants.DEFAULT_DECIMALS)
        } catch {
          gasLimitBn = BSEthereumConstants.DEFAULT_GAS_LIMIT_BN
        }

        const fee = gasPriceBn.multipliedBy(gasLimitBn).toHuman().toFormatted()

        const transaction = await signer.sendTransaction({
          ...transactionParams,
          gasLimit: gasLimitBn.toString(),
          maxPriorityFeePerGas: gasPriceBn.toString(),
          maxFeePerGas: gasPriceBn.toString(),
        })

        const txId = transaction.hash

        if (txId) {
          const { receiverAddress, token } = intent
          const tokenHash = token.hash

          transactions.push({
            blockchain: this.name,
            isPending: true,
            relatedAddress: address,
            txId,
            txIdUrl: this.explorerService.buildTransactionUrl(txId),
            date: new Date().toJSON(),
            networkFeeAmount: fee,
            view: 'default',
            events: [
              {
                eventType: 'token',
                amount: intent.amount,
                methodName: 'transfer',
                from: address,
                fromUrl: addressUrl,
                to: receiverAddress,
                toUrl: this.explorerService.buildAddressUrl(receiverAddress),
                tokenUrl: this.explorerService.buildContractUrl(tokenHash),
                token,
              },
            ],
          })
        }
      } catch (currentError: any) {
        if (!error) error = currentError
      }
    }

    if (!!error && transactions.length === 0) {
      throw error
    }

    return transactions
  }

  async calculateTransferFee(params: TTransferParams<N>): Promise<string> {
    const signer = await this._getSigner(params.senderAccount)
    let feeBn = new BSBigUnitAmount(0, BSEthereumConstants.DEFAULT_DECIMALS)

    for (const intent of params.intents) {
      const { gasPriceBn, transactionParams } = await this._buildTransferParams(intent)
      const estimatedGas = await signer.estimateGas(transactionParams)
      const intentFeeBn = gasPriceBn.multipliedBy(estimatedGas.toString())

      feeBn = feeBn.plus(intentFeeBn)
    }

    return feeBn.toHuman().toFormatted()
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)
    if (!address) throw new Error('No address found for domain name')
    return address
  }
}
