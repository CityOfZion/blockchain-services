import {
  BSBigHumanAmount,
  BSBigNumber,
  BSBigUnitAmount,
  BSError,
  BSKeychainHelper,
  BSUtilsHelper,
  type IBlockchainDataService,
  type IExchangeDataService,
  type IExplorerService,
  type IFullTransactionsDataService,
  type INftDataService,
  type ITokenService,
  type TBSAccount,
  type TBSNetwork,
  type TBSNetworkId,
  type TBSToken,
  type TGetLedgerTransport,
  type TPingNetworkResponse,
  type TTransactionDefault,
  type TTransferIntent,
  type TTransferParams,
} from '@cityofzion/blockchain-service'
import * as ethersBytes from '@ethersproject/bytes'
import * as ethersJsonWallets from '@ethersproject/json-wallets'
import axios from 'axios'
import { computeAddress, ethers, isAddress, JsonRpcProvider, type Signer, type TransactionRequest } from 'ethers'
import { BSEthereumConstants } from './constants/BSEthereumConstants'
import { BSEthereumHelper } from './helpers/BSEthereumHelper'
import { MoralisBDSEthereum } from './services/blockchain-data/MoralisBDSEthereum'
import { DefiLlamaCryptoCompareMoralisEDSEthereum } from './services/exchange-data/DefiLlamaCryptoCompareMoralisEDSEthereum'
import { BlockscoutESEthereum } from './services/explorer/BlockscoutESEthereum'
import { MoralisFullTransactionsDataServiceEthereum } from './services/full-transactions-data/MoralisFullTransactionsDataServiceEthereum'
import { EthersLedgerServiceEthereum } from './services/ledger/EthersLedgerServiceEthereum'
import { MoralisNDSEthereum } from './services/nft-data/MoralisNDSEthereum'
import { TokenServiceEthereum } from './services/token/TokenServiceEthereum'
import { WalletConnectServiceEthereum } from './services/wallet-connect/WalletConnectServiceEthereum'
import type { IBSEthereum, TBSEthereumName, TBSEthereumNetworkId, TSendTransactionPayloadParams } from './types'

export class BSEthereum<
  N extends string = TBSEthereumName,
  A extends TBSNetworkId = TBSEthereumNetworkId,
> implements IBSEthereum<N, A> {
  readonly name: N
  readonly bipDerivationPath = BSEthereumConstants.DEFAULT_BIP_DERIVATION_PATH
  readonly isMultiTransferSupported = false
  readonly isCustomNetworkSupported = false
  readonly defaultNetwork!: TBSNetwork<A>
  readonly availableNetworks!: TBSNetwork<A>[]

  network!: TBSNetwork<A>
  networkUrls!: string[]
  nativeTokens!: TBSToken[]
  tokens!: TBSToken[]
  feeToken!: TBSToken

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

    const networks = (BSEthereumConstants.NETWORKS_BY_EVM as any)[name]

    // This case is hit when the user tries to initialize the service with a custom network that is not in our predefined list. We want to allow that, but in that case we won't have the default network and available networks list.
    if (!networks || !networks.length) {
      return
    }

    this.availableNetworks = networks as TBSNetwork<A>[]
    this.defaultNetwork = this.availableNetworks.find(network => network.type === 'mainnet')! as TBSNetwork<A>

    this.setNetwork(network || this.defaultNetwork)
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

    const isNativeToken = this.tokenService.isNativeToken(intent.token.hash)

    if (isNativeToken) {
      transactionParams.to = intent.receiverAddress
      transactionParams.value = amount
    } else {
      const contract = new ethers.Contract(intent.token.hash, [
        'function transfer(address to, uint amount) returns (bool)',
      ])

      const populatedTransaction = await contract.transfer.populateTransaction(intent.receiverAddress, amount)

      transactionParams = { ...populatedTransaction, ...transactionParams }
    }

    return { transactionParams, gasPriceBn }
  }

  _setTokens(network: TBSNetwork<A>) {
    const nativeToken = BSEthereumHelper.getNativeAsset(network)

    this.nativeTokens = [nativeToken]
    this.tokens = this.nativeTokens
    this.feeToken = nativeToken
  }

  setNetwork(network: TBSNetwork<A>) {
    const networkUrls = BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new BSError(`Network with id ${network.id} is not available for ${this.name}`, 'INVALID_NETWORK')
    }

    this._setTokens(network)

    this.network = network
    this.networkUrls = networkUrls

    this.nftDataService = new MoralisNDSEthereum(this)
    this.explorerService = new BlockscoutESEthereum(this)
    this.exchangeDataService = new DefiLlamaCryptoCompareMoralisEDSEthereum(this)
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
        key = `0x${key}`
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
    const ethersMnemonic = ethers.Mnemonic.fromPhrase(BSKeychainHelper.normalizeMnemonic(mnemonic))
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

  async transfer({ senderAccount, intents, memo }: TTransferParams<N>): Promise<TTransactionDefault<N>[]> {
    // This blockchain has no memo support, sending without it could cause loss of funds when the receiver requires it
    if (memo) throw new BSError(`${this.name} does not support memo`, 'MEMO_NOT_SUPPORTED')

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

  async sendTransactionPayload({
    senderAccount,
    payload,
  }: TSendTransactionPayloadParams<N>): Promise<TTransactionDefault<N>> {
    const chainId = parseInt(this.network.id)

    if (payload.chainId !== undefined && Number(payload.chainId) !== chainId) {
      throw new BSError(
        `Transaction payload chain ID ${payload.chainId} does not match the current network chain ID ${chainId}`,
        'CHAIN_ID_MISMATCH'
      )
    }

    const signer = await this._getSigner(senderAccount)

    const transactionParams: TransactionRequest = {
      chainId,
      to: payload.to,
      data: payload.data,
      value: payload.value,
    }

    // The payload fees are calculated when the order is built and may be stale by the time it is sent, so the fresh
    // network fees are used as a floor to avoid the transaction getting stuck and dropped from the mempool
    const provider = new JsonRpcProvider(this.network.url)
    const feeData = await provider.getFeeData()

    let gasPrice: bigint

    if (feeData.maxFeePerGas !== null) {
      const maxFeePerGas = BSEthereumHelper.getMaxBigInt(feeData.maxFeePerGas, payload.maxFeePerGas, payload.gasPrice)
      const maxPriorityFeePerGas = BSEthereumHelper.getMaxBigInt(
        feeData.maxPriorityFeePerGas,
        payload.maxPriorityFeePerGas
      )

      transactionParams.type = 2
      transactionParams.maxFeePerGas = maxFeePerGas.toString()
      transactionParams.maxPriorityFeePerGas = (
        maxPriorityFeePerGas > maxFeePerGas ? maxFeePerGas : maxPriorityFeePerGas
      ).toString()
      gasPrice = maxFeePerGas
    } else {
      gasPrice = BSEthereumHelper.getMaxBigInt(feeData.gasPrice, payload.gasPrice, payload.maxFeePerGas)
      transactionParams.type = 0
      transactionParams.gasPrice = gasPrice.toString()
    }

    const gasPriceBn = new BSBigUnitAmount(gasPrice.toString(), BSEthereumConstants.DEFAULT_DECIMALS)

    let gasLimit: bigint

    try {
      const estimatedGas = await signer.estimateGas(transactionParams)

      gasLimit = BSEthereumHelper.getMaxBigInt(estimatedGas, payload.gasLimit)
    } catch (error) {
      // The default gas limit only covers a plain transfer, so a contract call sent with it would always fail with
      // "intrinsic gas too low". A failed estimation usually means the call reverts (e.g. missing ERC20 allowance)
      if (!payload.gasLimit) {
        throw new BSError(
          'Could not estimate the gas of the transaction payload, the transaction would probably fail',
          'GAS_ESTIMATION_FAILED',
          error
        )
      }

      gasLimit = BigInt(payload.gasLimit)
    }

    const gasLimitBn = new BSBigUnitAmount(gasLimit.toString(), BSEthereumConstants.DEFAULT_DECIMALS)

    transactionParams.gasLimit = gasLimitBn.toString()

    const transaction = await signer.sendTransaction(transactionParams)
    const txId = transaction.hash

    return {
      blockchain: this.name,
      isPending: true,
      relatedAddress: senderAccount.address,
      txId,
      txIdUrl: this.explorerService.buildTransactionUrl(txId),
      date: new Date().toJSON(),
      networkFeeAmount: gasPriceBn.multipliedBy(gasLimitBn).toHuman().toFormatted(),
      view: 'default',
      events: [],
    }
  }

  async waitForTransactionConfirmation(txId: string): Promise<void> {
    const provider = new JsonRpcProvider(this.network.url)
    const receipt = await provider.waitForTransaction(
      txId,
      1,
      this.blockchainDataService.maxTimeToConfirmTransactionInMs
    )

    if (!receipt || receipt.status !== 1) {
      throw new BSError(`Transaction ${txId} failed`, 'TRANSACTION_FAILED')
    }
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const provider = new JsonRpcProvider(this.network.url)
    const address = await provider.resolveName(domainName)

    if (!address) throw new BSError('No address found for domain name', 'ADDRESS_NOT_FOUND')

    return address
  }
}
