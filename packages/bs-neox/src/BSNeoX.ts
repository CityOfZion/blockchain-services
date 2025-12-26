import { BSEthereum, BSEthereumConstants, TokenServiceEthereum } from '@cityofzion/bs-ethereum'
import { BSNeoXConstants } from './constants/BSNeoXConstants'
import {
  BSUtilsHelper,
  TGetLedgerTransport,
  INeo3NeoXBridgeService,
  TBSNetwork,
  TTransferParam,
  BSPromisesHelper,
} from '@cityofzion/blockchain-service'
import { BlockscoutBDSNeoX } from './services/blockchain-data/BlockscoutBDSNeoX'
import { WalletConnectServiceNeoX } from './services/wallet-connect/WalletConnectServiceNeoX'
import { FlamingoForthewinEDSNeoX } from './services/exchange-data/FlamingoForthewinEDSNeoX'
import { BlockscoutESNeoX } from './services/explorer/BlockscoutESNeoX'
import { GhostMarketNDSNeoX } from './services/nft-data/GhostMarketNDSNeoX'
import { Neo3NeoXBridgeService } from './services/neo3neoXBridge/Neo3NeoXBridgeService'
import { IBSNeoX, TBSNeoXNetworkId } from './types'
import { ethers } from 'ethers'
import axios from 'axios'
import { CONSENSUS_ABI } from './assets/abis/consensus'
import { KEY_MANAGEMENT_ABI } from './assets/abis/key-management'
import { getConsensusThreshold, getScaler, PublicKey } from 'neox-tpke'
import { concat, keccak256, pad, parseTransaction, toBytes, toHex } from 'viem'

// Necessary to run on Node.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
if (typeof self === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  global.self = global
}

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

  async transfer(params: TTransferParam<N>): Promise<string[]> {
    const isAntiMevRpcNetworkUrl = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[this.network.id].some(
      rpcNetworkUrl => rpcNetworkUrl === this.network.url
    )

    if (!isAntiMevRpcNetworkUrl) return await super.transfer(params)

    const signer = await this.generateSigner(params.senderAccount)
    let nonce = await signer.getTransactionCount()

    if (isNaN(nonce)) {
      throw new Error('Invalid nonce')
    }

    const chainId = +this.network.id

    if (isNaN(chainId)) {
      throw new Error('Invalid chainId')
    }

    const transactionHashes: string[] = []
    let error: Error | undefined

    for (const intent of params.intents) {
      try {
        const { transactionParams, gasPrice } = await this._buildTransferParams(intent)
        let gasLimit: ethers.BigNumberish

        try {
          gasLimit = await signer.estimateGas(transactionParams)
        } catch {
          gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
        }

        const [_transaction, transactionError] = await BSPromisesHelper.tryCatch(() =>
          signer.sendTransaction({
            ...transactionParams,
            chainId,
            nonce,
            gasLimit,
            maxPriorityFeePerGas: gasPrice,
            maxFeePerGas: gasPrice,
          })
        )

        if (
          !transactionError?.error ||
          transactionError.error.code !== -32000 ||
          transactionError.error.message !== 'transaction cached'
        ) {
          throw new Error('Transaction not cached')
        }

        const signature = await signer.signMessage(nonce.toString())
        const hexNonce = toHex(nonce)

        // Keep using Axios because of the signer and provider don't have the eth_getCachedTransaction method
        const cachedTransactionResponse = await axios.post(this.network.url, {
          id: Date.now(),
          jsonrpc: '2.0',
          method: 'eth_getCachedTransaction',
          params: [hexNonce, signature],
        })

        const cachedTransaction = cachedTransactionResponse.data.result as `0x${string}`

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

        const newTransactionParams = {
          chainId,
          nonce,
          to: BSNeoXConstants.GOVERNANCE_REWARD_SCRIPT_HASH,
          data: toHex(envelopedData),
        }

        try {
          gasLimit = await signer.estimateGas(newTransactionParams)
        } catch {
          gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
        }

        const signedTransaction = await signer.signTransaction({
          gasLimit,
          gasPrice,
          ...newTransactionParams,
        })

        // Keep using Axios because of the signer and provider don't have the eth_sendRawTransaction method
        const transactionResponse = await axios.post(this.network.url, {
          id: Date.now(),
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [signedTransaction],
        })

        const transactionHash = transactionResponse?.data?.result

        if (transactionHash) {
          transactionHashes.push(transactionHash)
          nonce++
        }
      } catch (newError: any) {
        console.error(newError)

        if (!error) error = newError
      }
    }

    if (error && !transactionHashes.some(hash => !!hash)) throw error

    return transactionHashes
  }
}
