import {
  BSBigNumberHelper,
  BSError,
  BSUtilsHelper,
  INeo3NeoXBridgeService,
  TBridgeToken,
  THexString,
  TNeo3NeoXBridgeServiceBridgeParam,
  TNeo3NeoXBridgeServiceConstants,
  TNeo3NeoXBridgeServiceGetApprovalParam,
  TNeo3NeoXBridgeServiceGetNonceParams,
  TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { ethers } from 'ethers'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { ERC20_ABI } from '@cityofzion/bs-ethereum'
import axios from 'axios'
import { BlockscoutBDSNeoX } from '../blockchain-data/BlockscoutBDSNeoX'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'
import {
  TNeo3NeoXBridgeServiceGetTransactionByNonceApiReponse,
  TNeo3NeoXBridgeServiceTransactionLogApiResponse,
  type IBSNeoX,
} from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '@cityofzion/bs-neo3'

export class Neo3NeoXBridgeService<BSName extends string> implements INeo3NeoXBridgeService<BSName> {
  static readonly BRIDGE_SCRIPT_HASH = '0x1212000000000000000000000000000000000004'
  static readonly BRIDGE_FEE = 0.1
  static readonly BRIDGE_BASE_CONFIRMATION_URL = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'

  readonly #service: IBSNeoX<BSName>
  readonly gasToken: TBridgeToken<BSName>
  readonly neoToken: TBridgeToken<BSName>

  constructor(service: IBSNeoX<BSName>) {
    this.#service = service

    this.gasToken = { ...BSNeoXConstants.NATIVE_ASSET, blockchain: service.name, multichainId: 'gas' }
    this.neoToken = { ...BSNeoXConstants.NEO_TOKEN, blockchain: service.name, multichainId: 'neo' }
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

      const chainId = parseInt(this.#service.network.id)

      if (isNaN(chainId)) {
        throw new Error('Invalid chainId')
      }

      const signer = await this.#service.generateSigner(params.account)
      const nonce = await signer.getTransactionCount('pending')

      if (isNaN(nonce)) {
        throw new Error('Invalid nonce')
      }

      const approvedEstimated = await signer.estimateGas({ ...populatedApproveTransaction, chainId, nonce, type: 2 })
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
    if (!BSNeoXHelper.isMainnetNetwork(this.#service.network)) {
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')
    }

    const signer = await this.#service.generateSigner(params.account)
    const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const to: THexString = `0x${wallet.getScriptHashFromAddress(params.receiverAddress)}`
    const bridgeFee = ethers.utils.parseUnits(params.bridgeFee, BSNeoXConstants.NATIVE_ASSET.decimals)
    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)
    const gasPrice = await signer.getGasPrice()
    const transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = { type: 2 }

    if (isNativeToken) {
      const populatedTransactionParams = await bridgeContract.populateTransaction.withdrawNative(to, bridgeFee)

      Object.assign(transactionParams, populatedTransactionParams, {
        value: ethers.utils.parseUnits(params.amount, params.token.decimals).add(bridgeFee),
      })
    } else {
      const approveTransactionParam = await this.#buildApproveTransactionParam(params)

      if (approveTransactionParam) {
        const transactionHash = await this.#service.sendTransaction({
          signer,
          gasPrice,
          params: approveTransactionParam,
        })

        const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

        await provider.waitForTransaction(transactionHash)
      }

      const fixedAmount = BSBigNumberHelper.format(params.amount, { decimals: 0 })
      const amount = ethers.utils.parseUnits(fixedAmount, params.token.decimals)

      const populatedTransactionParams = await bridgeContract.populateTransaction.withdrawToken(
        params.token.hash,
        to,
        amount
      )

      Object.assign(transactionParams, populatedTransactionParams, { value: bridgeFee })
    }

    return await this.#service.sendTransaction({ signer, gasPrice, params: transactionParams })
  }

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<BSName>): Promise<string> {
    const [transactionLogsResponse, transactionLogsResponseError] = await BSUtilsHelper.tryCatch(async () => {
      const client = BlockscoutBDSNeoX.getClient(this.#service.network)
      return await client.get<TNeo3NeoXBridgeServiceTransactionLogApiResponse>(
        `/transactions/${params.transactionHash}/logs`
      )
    })

    if (!transactionLogsResponse)
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', transactionLogsResponseError)

    const [nonce, nonceError] = await BSUtilsHelper.tryCatch(() => {
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
