import {
  BSBigNumberHelper,
  BSError,
  BSPromisesHelper,
  INeo3NeoXBridgeService,
  TBridgeToken,
  TNeo3NeoXBridgeServiceBridgeParam,
  TNeo3NeoXBridgeServiceConstants,
  TNeo3NeoXBridgeServiceGetApprovalParam,
  TNeo3NeoXBridgeServiceGetNonceParams,
  TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { BSNeoX } from '../../BSNeoX'
import { ethers } from 'ethers'
import { wallet } from '@cityofzion/neon-js'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { BSEthereumConstants, ERC20_ABI } from '@cityofzion/bs-ethereum'
import axios from 'axios'
import { BlockscoutBDSNeoX } from '../blockchain-data/BlockscoutBDSNeoX'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'
import {
  TNeo3NeoXBridgeServiceGetTransactionByNonceApiReponse,
  TNeo3NeoXBridgeServiceTransactionLogApiResponse,
} from '../../types'

export class Neo3NeoXBridgeService<BSName extends string> implements INeo3NeoXBridgeService<BSName> {
  static readonly BRIDGE_SCRIPT_HASH = '0x1212000000000000000000000000000000000004'
  static readonly BRIDGE_FEE = 0.1
  static readonly BRIDGE_BASE_CONFIRMATION_URL = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'

  readonly #service: BSNeoX<BSName>
  readonly tokens: TBridgeToken<BSName>[]

  constructor(service: BSNeoX<BSName>) {
    this.#service = service

    this.tokens = [
      { ...BSNeoXConstants.NATIVE_ASSET, multichainId: 'gas', blockchain: service.name },
      { ...BSNeoXConstants.NEO_TOKEN, multichainId: 'neo', blockchain: service.name },
    ]
  }

  async #buildApproveTransactionParam(params: TNeo3NeoXBridgeServiceGetApprovalParam<BSName>) {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
    const erc20Contract = new ethers.Contract(params.token.hash, ERC20_ABI, provider)

    const allowance = await erc20Contract.allowance(params.account.address, Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH)
    const allowanceNumber = BSBigNumberHelper.fromDecimals(allowance.toString(), BSNeoXConstants.NEO_TOKEN.decimals)

    // We are using 0 as the decimals because the NEO token in Neo3 has 0 decimals
    const fixedAmount = BSBigNumberHelper.format(params.amount, { decimals: 0 })

    if (allowanceNumber.isGreaterThanOrEqualTo(fixedAmount)) {
      return null
    }

    const amount = ethers.utils.parseUnits(fixedAmount, params.token.decimals)

    return await erc20Contract.populateTransaction.approve(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, amount)
  }

  async getBridgeConstants(token: TBridgeToken<BSName>): Promise<TNeo3NeoXBridgeServiceConstants> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
      const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI, provider)

      const isNativeToken = this.#service.tokenService.predicateByHash(token, BSNeoXConstants.NATIVE_ASSET)

      const response = isNativeToken
        ? await bridgeContract.nativeBridge()
        : await bridgeContract.tokenBridges(token.hash)

      const bridgeFeeBn = BSBigNumberHelper.fromDecimals(
        response.config.fee.toString(),
        BSNeoXConstants.NATIVE_ASSET.decimals
      )
      const minAmountBn = BSBigNumberHelper.fromDecimals(response.config.minAmount.toString(), token.decimals)
      const maxAmountBn = BSBigNumberHelper.fromDecimals(response.config.maxAmount.toString(), token.decimals)

      const bridgeFee = BSBigNumberHelper.format(bridgeFeeBn, { decimals: BSNeoXConstants.NATIVE_ASSET.decimals })
      const bridgeMinAmount = BSBigNumberHelper.format(minAmountBn, { decimals: token.decimals })
      const bridgeMaxAmount = BSBigNumberHelper.format(maxAmountBn, { decimals: token.decimals })

      return {
        bridgeFee,
        bridgeMaxAmount,
        bridgeMinAmount,
      }
    } catch (error) {
      throw new BSError('Failed to get bridge constants', 'BRIDGE_CONSTANTS_ERROR', error)
    }
  }

  async getApprovalFee(params: TNeo3NeoXBridgeServiceGetApprovalParam<BSName>): Promise<string> {
    try {
      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

      if (isNativeToken) {
        throw new BSError('No allowance fee for native token', 'NO_ALLOWANCE_FEE')
      }

      const populatedApproveTransaction = await this.#buildApproveTransactionParam(params)
      if (!populatedApproveTransaction) {
        throw new BSError('Allowance is already sufficient', 'ALLOWANCE_ALREADY_SUFFICIENT')
      }

      const signer = await this.#service.generateSigner(params.account)
      const approvedEstimated = await signer.estimateGas({ ...populatedApproveTransaction, type: 2 })

      const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
      const gasPrice = await provider.getGasPrice()

      return ethers.utils.formatEther(gasPrice.mul(approvedEstimated))
    } catch (error) {
      if (error instanceof BSError) {
        throw error
      }

      throw new BSError('Failed to get allowance fee', 'ALLOWANCE_FEE_ERROR', error)
    }
  }

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string> {
    if (!BSNeoXHelper.isMainnetNetwork(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account } = params

    const signer = await this.#service.generateSigner(account)

    const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)

    const to = '0x' + wallet.getScriptHashFromAddress(params.receiverAddress)
    const bridgeFee = ethers.utils.parseUnits(params.bridgeFee, BSNeoXConstants.NATIVE_ASSET.decimals)

    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

    let bridgeTransactionParam: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      type: 2,
    }

    if (isNativeToken) {
      const populatedTransaction = await bridgeContract.populateTransaction.withdrawNative(to, bridgeFee)
      bridgeTransactionParam = {
        ...bridgeTransactionParam,
        ...populatedTransaction,
        value: ethers.utils.parseUnits(params.amount, params.token.decimals).add(bridgeFee),
      }
    } else {
      const approveTransactionParam = await this.#buildApproveTransactionParam(params)
      if (approveTransactionParam) {
        const approveTransaction = await signer.sendTransaction(approveTransactionParam)
        await approveTransaction.wait()
      }

      const fixedAmount = BSBigNumberHelper.format(params.amount, { decimals: 0 })
      const amount = ethers.utils.parseUnits(fixedAmount, params.token.decimals)

      const populatedTransaction = await bridgeContract.populateTransaction.withdrawToken(params.token.hash, to, amount)

      bridgeTransactionParam = {
        ...bridgeTransactionParam,
        ...populatedTransaction,
        value: bridgeFee,
      }
    }

    let gasLimit: ethers.BigNumberish
    try {
      gasLimit = await signer.estimateGas(bridgeTransactionParam)
    } catch (error) {
      gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
    }

    const gasPrice = await signer.getGasPrice()

    const transaction = await signer.sendTransaction({
      ...bridgeTransactionParam,
      gasLimit,
      maxPriorityFeePerGas: gasPrice,
      maxFeePerGas: gasPrice,
    })
    return transaction.hash
  }

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<BSName>): Promise<string> {
    const [transactionLogsResponse, transactionLogsResponseError] = await BSPromisesHelper.tryCatch(async () => {
      const client = BlockscoutBDSNeoX.getClient(this.#service.network)
      return await client.get<TNeo3NeoXBridgeServiceTransactionLogApiResponse>(
        `/transactions/${params.transactionHash}/logs`
      )
    })

    if (!transactionLogsResponse)
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', transactionLogsResponseError)

    const [nonce, nonceError] = await BSPromisesHelper.tryCatch(() => {
      const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)

      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

      const dataIndex = isNativeToken ? 0 : 1
      const log = transactionLogsResponse.data.items[dataIndex]
      const parsedLog = BridgeInterface.parseLog({
        data: log.data,
        topics: log.topics.filter(Boolean),
      })
      return parsedLog.args.nonce ? parsedLog.args.nonce.toString() : undefined
    })

    if (!nonce) {
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', nonceError)
    }

    return nonce
  }

  async getTransactionHashByNonce(
    params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<BSName>
  ): Promise<string> {
    try {
      let url: string

      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

      if (isNativeToken) {
        url = `${Neo3NeoXBridgeService.BRIDGE_BASE_CONFIRMATION_URL}/${params.nonce}`
      } else {
        url = `${Neo3NeoXBridgeService.BRIDGE_BASE_CONFIRMATION_URL}/${BSNeoXConstants.NEO_TOKEN.hash}/${params.nonce}`
      }

      const response = await axios.get<TNeo3NeoXBridgeServiceGetTransactionByNonceApiReponse>(url)

      if (!response.data?.txid) {
        throw new BSError('Transaction ID not found in response', 'TXID_NOT_FOUND')
      }

      return response.data.txid
    } catch (error) {
      throw new BSError('Transaction ID not found in response', 'TXID_NOT_FOUND', error)
    }
  }
}
