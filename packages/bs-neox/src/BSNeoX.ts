import { BSEthereum, BSEthereumConstants, TokenServiceEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from './constants/BSNeoXConstants'
import {
  BSPromisesHelper,
  BSUtilsHelper,
  INeo3NeoXBridgeService,
  TBSNetwork,
  TGetLedgerTransport,
  THexString,
  TTransferParam,
} from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { WalletConnectServiceNeoX } from './services/wallet-connect/WalletConnectServiceNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'
import { IBSNeoX, TBSNeoXNetworkId, TSendTransactionParams } from './types'
import { ethers } from 'ethers'
import axios from 'axios'
import { CONSENSUS_ABI } from './assets/abis/consensus'
import { KEY_MANAGEMENT_ABI } from './assets/abis/key-management'
import { getConsensusThreshold, getScaler, PublicKey } from 'neox-tpke'
import { concat, keccak256, pad, parseTransaction, toBytes, toHex } from 'viem'

export class BSNeoX<N extends string = string> extends BSEthereum<N, TBSNeoXNetworkId> implements IBSNeoX<N> {
  neo3NeoXBridgeService!: INeo3NeoXBridgeService<N>

  readonly defaultNetwork: TBSNetwork<TBSNeoXNetworkId>
  readonly availableNetworks: TBSNetwork<TBSNeoXNetworkId>[]

  constructor(name: N, network?: TBSNetwork<TBSNeoXNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    super(name, undefined, undefined, getLedgerTransport)

    this.tokens = [BSNeoXConstants.NATIVE_ASSET]
    this.nativeTokens = [BSNeoXConstants.NATIVE_ASSET]
    this.feeToken = BSNeoXConstants.NATIVE_ASSET

    this.availableNetworks = BSNeoXConstants.ALL_NETWORKS
    this.defaultNetwork = BSNeoXConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  setNetwork(network: TBSNetwork<TBSNeoXNetworkId>) {
    const rpcNetworkUrls = BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, rpcNetworkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.rpcNetworkUrls = rpcNetworkUrls

    this.nftDataService = new GhostMarketNDSNeoX(this)
    this.explorerService = new BlockscoutESNeoX(this)
    this.exchangeDataService = new FlamingoForthewinEDSNeoX(this)
    this.neo3NeoXBridgeService = new Neo3NeoXBridgeService(this)
    this.blockchainDataService = new BlockscoutBDSNeoX(this)
    this.tokenService = new TokenServiceEthereum()
    this.walletConnectService = new WalletConnectServiceNeoX(this)
  }

  async sendTransaction({ signer, gasPrice, params }: TSendTransactionParams) {
    const chainId = parseInt(this.network.id)

    if (isNaN(chainId)) {
      throw new Error('Invalid chainId')
    }

    params.chainId = chainId

    const nonce = await signer.getTransactionCount('pending')

    if (isNaN(nonce)) {
      throw new Error('Invalid nonce')
    }

    params.nonce = nonce

    const gasParams = { maxPriorityFeePerGas: gasPrice, maxFeePerGas: gasPrice }
    let gasLimit: ethers.BigNumberish

    try {
      gasLimit = await signer.estimateGas(params)
    } catch {
      gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
    }

    const [firstTransactionResponse, firstTransactionError] = await BSPromisesHelper.tryCatch(() =>
      signer.sendTransaction({
        ...params,
        ...gasParams,
        gasLimit,
      })
    )

    const isAntiMevNetwork = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[this.network.id].some(
      url => url === this.network.url
    )

    if (!isAntiMevNetwork) {
      if (firstTransactionError) throw firstTransactionError

      return firstTransactionResponse!.hash
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
    const consensusSize = BigInt(await consensusContract.consensusSize())

    const keyManagementContract = new ethers.Contract(
      BSNeoXConstants.KEY_MANAGEMENT_SCRIPT_HASH,
      KEY_MANAGEMENT_ABI,
      signer
    )

    const roundNumber = BigInt(await keyManagementContract.roundNumber())
    const aggregatedCommitment = await keyManagementContract.aggregatedCommitments(roundNumber)

    const publicKey = PublicKey.fromAggregatedCommitment(
      toBytes(aggregatedCommitment),
      getScaler(consensusSize, getConsensusThreshold(consensusSize))
    )

    const { encryptedKey, encryptedMsg } = publicKey.encrypt(toBytes(cachedTransaction))

    const parsedTransaction = parseTransaction(cachedTransaction)

    const envelopedData = concat([
      new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      pad(toBytes(roundNumber), { size: 4 }),
      pad(toBytes(parsedTransaction.gas!), { size: 4 }),
      toBytes(keccak256(cachedTransaction)),
      encryptedKey,
      encryptedMsg,
    ])

    const newParams = {
      chainId,
      nonce,
      to: BSNeoXConstants.GOVERNANCE_REWARD_SCRIPT_HASH,
      data: toHex(envelopedData),
    }

    try {
      gasLimit = await signer.estimateGas(newParams)
    } catch {
      gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
    }

    const [secondTransactionResponse, secondTransactionError] = await BSPromisesHelper.tryCatch(() =>
      signer.sendTransaction({
        ...newParams,
        ...gasParams,
        gasLimit,
      })
    )

    const transactionHash: string = secondTransactionResponse?.hash || secondTransactionError?.returnedHash

    if (!transactionHash) throw secondTransactionError || new Error('Transaction error')

    return transactionHash
  }

  async transfer(params: TTransferParam<N>): Promise<string[]> {
    const signer = await this.generateSigner(params.senderAccount)
    const transactionHashes: string[] = []
    let error: Error | undefined

    for (const intent of params.intents) {
      try {
        const { transactionParams, gasPrice } = await this._buildTransferParams(intent)
        const transactionHash = await this.sendTransaction({ signer, gasPrice, params: transactionParams })

        transactionHashes.push(transactionHash)
      } catch (newError: any) {
        console.error(newError)

        if (!error) error = newError
      }
    }

    if (error && transactionHashes.every(hash => !hash)) throw error

    return transactionHashes
  }
}
