import { BSEthereum, BSEthereumConstants, TokenServiceEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from './constants/BSNeoXConstants'
import {
  BSBigNumber,
  BSBigUnitAmount,
  BSError,
  BSUtilsHelper,
  type TBSNetwork,
  type TGetLedgerTransport,
  type THexString,
  type TTransactionDefault,
  type TTransferParams,
} from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { WalletConnectServiceNeoX } from './services/wallet-connect/WalletConnectServiceNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3-neox-bridge/Neo3NeoXBridgeService'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId, TSendTransactionParams, TSendTransactionResponse } from './types'
import { ethers, JsonRpcProvider, TransactionRequest } from 'ethers'
import axios from 'axios'
import { CONSENSUS_ABI } from './assets/abis/consensus'
import { KEY_MANAGEMENT_ABI } from './assets/abis/key-management'
import { getConsensusThreshold, getScaler, PublicKey } from 'neox-tpke'
import { concat, keccak256, pad, parseTransaction, toBytes, toHex } from 'viem'
import { BlockscoutFullTransactionsDataService } from './services/full-transactions-data/BlockscoutFullTransactionsDataService'
import { BSNeoXHelper } from './helpers/BSNeoXHelper'

export class BSNeoX extends BSEthereum<TBSNeoXName, TBSNeoXNetworkId> implements IBSNeoX {
  neo3NeoXBridgeService!: Neo3NeoXBridgeService
  walletConnectService!: WalletConnectServiceNeoX

  readonly defaultNetwork: TBSNetwork<TBSNeoXNetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeoXNetworkId>[]

  constructor(network?: TBSNetwork<TBSNeoXNetworkId>, getLedgerTransport?: TGetLedgerTransport<TBSNeoXName>) {
    super('neox', undefined, getLedgerTransport)

    this.nativeTokens = [BSNeoXConstants.NATIVE_ASSET]
    this.feeToken = BSNeoXConstants.NATIVE_ASSET

    this.availableNetworks = BSNeoXConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoXConstants.MAINNET_NETWORK

    this.setNetwork(network || this.defaultNetwork)
  }

  async _sendTransaction({
    signer,
    gasPriceBn,
    transactionParams,
  }: TSendTransactionParams): Promise<TSendTransactionResponse> {
    const chainId = parseInt(this.network.id)

    if (isNaN(chainId)) {
      throw new Error('Invalid chainId')
    }

    transactionParams.chainId = chainId

    const nonce = await signer.getNonce('pending')

    if (isNaN(nonce)) {
      throw new Error('Invalid nonce')
    }

    transactionParams.nonce = nonce

    try {
      const estimatedGas = await signer.estimateGas(transactionParams)
      transactionParams.gasLimit = new BSBigUnitAmount(
        estimatedGas.toString(),
        BSEthereumConstants.DEFAULT_DECIMALS
      ).toString()
    } catch {
      transactionParams.gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT_BN.toString()
    }
    transactionParams.maxPriorityFeePerGas = gasPriceBn.toString()
    transactionParams.maxFeePerGas = gasPriceBn.toString()

    const [firstTransactionResponse, firstTransactionError] = await BSUtilsHelper.tryCatch(() =>
      signer.sendTransaction(transactionParams)
    )

    const isAntiMevNetwork = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[this.network.id].some(
      url => url === this.network.url
    )

    if (!isAntiMevNetwork) {
      if (firstTransactionError) throw firstTransactionError

      const fee = gasPriceBn.multipliedBy(transactionParams.gasLimit).toHuman().toFormatted()
      return { transactionHash: firstTransactionResponse!.hash, fee }
    }

    if (!firstTransactionError?.error || firstTransactionError.error.message !== 'transaction cached') {
      throw new Error('Transaction not cached')
    }

    const hexNonce = toHex(nonce)
    const signature = await signer.signMessage(nonce.toString())

    // Keep using Axios because of the signer don't have the eth_getCachedTransaction method
    const cachedTransactionResponse = await axios.post(this.network.url, {
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'eth_getCachedTransaction',
      params: [hexNonce, signature],
    })

    const cachedTransaction = cachedTransactionResponse.data.result as THexString

    const consensusContract = new ethers.Contract(BSNeoXConstants.CONSENSUS_SCRIPT_HASH, CONSENSUS_ABI, signer)
    const consensusSize = await consensusContract.consensusSize()
    const consensusSizeBigInt = new BSBigNumber(consensusSize.toString()).toBigInt()

    const keyManagementContract = new ethers.Contract(
      BSNeoXConstants.KEY_MANAGEMENT_SCRIPT_HASH,
      KEY_MANAGEMENT_ABI,
      signer
    )

    const roundedNumber = await keyManagementContract.roundNumber()
    const roundNumberBigInt = new BSBigNumber(roundedNumber.toString()).toBigInt()
    const aggregatedCommitment = await keyManagementContract.aggregatedCommitments(roundNumberBigInt)

    const publicKey = PublicKey.fromAggregatedCommitment(
      toBytes(aggregatedCommitment),
      getScaler(consensusSizeBigInt, getConsensusThreshold(consensusSizeBigInt))
    )

    const { encryptedKey, encryptedMsg } = publicKey.encrypt(toBytes(cachedTransaction))

    const parsedTransaction = parseTransaction(cachedTransaction)

    const envelopedData = concat([
      new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      pad(toBytes(roundNumberBigInt), { size: 4 }),
      pad(toBytes(parsedTransaction.gas!), { size: 4 }),
      toBytes(keccak256(cachedTransaction)),
      encryptedKey,
      encryptedMsg,
    ])

    const newParams: TransactionRequest = {
      chainId,
      nonce,
      to: BSNeoXConstants.GOVERNANCE_REWARD_SCRIPT_HASH,
      data: toHex(envelopedData),
    }

    try {
      const estimatedGas = await signer.estimateGas(newParams)

      newParams.gasLimit = new BSBigUnitAmount(estimatedGas.toString(), BSEthereumConstants.DEFAULT_DECIMALS).toString()
    } catch {
      newParams.gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT_BN.toString()
    }

    newParams.maxPriorityFeePerGas = gasPriceBn.toString()
    newParams.maxFeePerGas = gasPriceBn.toString()

    const provider = new JsonRpcProvider(this.network.url)
    const signedTransaction = await signer.signTransaction(newParams)
    const transactionHash: string = await provider.send('eth_sendRawTransaction', [signedTransaction])

    if (!transactionHash) {
      throw new BSError('Transaction error', 'TRANSACTION_ERROR')
    }

    const fee = gasPriceBn.multipliedBy(newParams.gasLimit).toHuman().toFormatted()

    return { transactionHash, fee }
  }

  setNetwork(network: TBSNetwork<TBSNeoXNetworkId>) {
    const networkUrls = BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new BSError(`Network with id ${network.id} is not available for ${this.name}`, 'INVALID_NETWORK')
    }

    this.network = network
    this.networkUrls = networkUrls

    this.tokens = [BSNeoXConstants.NATIVE_ASSET, BSNeoXHelper.getNeoToken(this.network)]

    this.nftDataService = new GhostMarketNDSNeoX(this)
    this.explorerService = new BlockscoutESNeoX(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeoX(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new BlockscoutBDSNeoX(this)
    this.tokenService = new TokenServiceEthereum(this)
    this.walletConnectService = new WalletConnectServiceNeoX(this)
    this.fullTransactionsDataService = new BlockscoutFullTransactionsDataService(this)
  }

  async transfer({
    senderAccount,
    intents,
  }: TTransferParams<TBSNeoXName>): Promise<TTransactionDefault<TBSNeoXName>[]> {
    const signer = await this._getSigner(senderAccount)
    const { address } = senderAccount
    const addressUrl = this.explorerService.buildAddressUrl(address)
    const transactions: TTransactionDefault<TBSNeoXName>[] = []
    let error: Error | undefined

    for (const intent of intents) {
      try {
        const { transactionParams, gasPriceBn } = await this._buildTransferParams(intent)
        const { transactionHash, fee } = await this._sendTransaction({ signer, gasPriceBn, transactionParams })

        if (transactionHash) {
          const { receiverAddress, token } = intent
          const tokenHash = token.hash

          transactions.push({
            blockchain: this.name,
            isPending: true,
            relatedAddress: address,
            txId: transactionHash,
            txIdUrl: this.explorerService.buildTransactionUrl(transactionHash),
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
}
