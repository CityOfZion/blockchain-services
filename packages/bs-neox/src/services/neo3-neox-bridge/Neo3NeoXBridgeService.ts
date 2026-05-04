import {
  BSBigHumanAmount,
  BSBigUnitAmount,
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
  type TNeo3NeoXBridgeTransactionData,
  type TTransactionBase,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { ethers, Interface, JsonRpcProvider, type TransactionRequest } from 'ethers'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { BSEthereumConstants, ERC20_ABI } from '@cityofzion/bs-ethereum'
import axios from 'axios'
import { BlockscoutBDSNeoX } from '../blockchain-data/BlockscoutBDSNeoX'
import type {
  TNeo3NeoXBridgeServiceGetTransactionByNonceApiReponse,
  TNeo3NeoXBridgeServiceTransactionLogApiResponse,
  IBSNeoX,
  TBSNeoXName,
  TBlockscoutBDSNeoXTransactionApiResponse,
} from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '@cityofzion/bs-neo3'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'

export class Neo3NeoXBridgeService implements INeo3NeoXBridgeService<TBSNeoXName> {
  static readonly BRIDGE_SCRIPT_HASH = '0x1212000000000000000000000000000000000004'
  static readonly BRIDGE_FEE = 0.1
  static readonly BRIDGE_BASE_CONFIRMATION_URL = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'

  readonly gasToken: TBridgeToken<TBSNeoXName>
  readonly neoToken: TBridgeToken<TBSNeoXName>

  readonly #service: IBSNeoX

  constructor(service: IBSNeoX) {
    this.#service = service

    const neoToken = BSNeoXHelper.getNeoToken(this.#service.network)

    this.gasToken = { ...BSNeoXConstants.NATIVE_ASSET, blockchain: service.name, multichainId: 'gas' }
    this.neoToken = { ...neoToken, blockchain: service.name, multichainId: 'neo' }
  }

  async #buildApproveTransactionParam(params: TNeo3NeoXBridgeServiceGetApprovalParam<TBSNeoXName>) {
    const provider = new JsonRpcProvider(this.#service.network.url)
    const erc20Contract = new ethers.Contract(params.token.hash, ERC20_ABI, provider)

    const allowance = await erc20Contract.allowance(params.account.address, Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH)
    const allowanceNumber = new BSBigUnitAmount(allowance.toString(), this.neoToken.decimals)

    // We are using 0 as the decimals because the NEO token in Neo3 has 0 decimals
    const fixedAmount = new BSBigHumanAmount(params.amount, 0).toFormatted()
    const amount = new BSBigHumanAmount(fixedAmount, params.token.decimals).toUnit().toString()

    if (allowanceNumber.isGreaterThanOrEqualTo(amount)) {
      return null
    }

    return await erc20Contract.approve.populateTransaction(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, amount)
  }

  _getDataFromBlockscoutTransaction(
    response: TBlockscoutBDSNeoXTransactionApiResponse
  ): TNeo3NeoXBridgeTransactionData<TBSNeoXName> | undefined {
    if (response.to.hash.toLowerCase() !== Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH.toLowerCase()) {
      return undefined
    }

    const BridgeInterface = new Interface(BRIDGE_ABI)
    const input = BridgeInterface.parseTransaction({ data: response.raw_input })

    if (!input) return undefined

    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const to = input.args._to
    const receiverAddress = wallet.getAddressFromScriptHash(to.startsWith('0x') ? to.slice(2) : to)

    let tokenToUse: TBridgeToken<TBSNeoXName> | undefined
    let amount: string | undefined

    if (input.name === 'withdrawNative') {
      tokenToUse = this.gasToken
      amount = new BSBigUnitAmount(response.value, tokenToUse.decimals)
        .toHuman()
        .minus(Neo3NeoXBridgeService.BRIDGE_FEE)
        .toFormatted()
    } else if (input.name === 'withdrawToken') {
      tokenToUse = this.neoToken
      amount = new BSBigUnitAmount(input.args._amount.toString(), tokenToUse.decimals).toHuman().toFormatted()
    }

    if (!tokenToUse || !amount) return undefined

    return { neo3NeoxBridge: { tokenToUse, receiverAddress, amount } }
  }

  async getBridgeConstants(token: TBridgeToken<TBSNeoXName>): Promise<TNeo3NeoXBridgeServiceConstants> {
    try {
      const provider = new JsonRpcProvider(this.#service.network.url)
      const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI, provider)

      const isNativeToken = this.#service.tokenService.predicateByHash(token, BSNeoXConstants.NATIVE_ASSET)

      const response = isNativeToken
        ? await bridgeContract.nativeBridge()
        : await bridgeContract.tokenBridges(token.hash)

      const bridgeFee = new BSBigUnitAmount(response.config.fee.toString(), BSNeoXConstants.NATIVE_ASSET.decimals)
        .toHuman()
        .toFormatted()
      const bridgeMinAmount = new BSBigUnitAmount(response.config.minAmount.toString(), token.decimals)
        .toHuman()
        .toFormatted()
      const bridgeMaxAmount = new BSBigUnitAmount(response.config.maxAmount.toString(), token.decimals)
        .toHuman()
        .toFormatted()

      return {
        bridgeFee,
        bridgeMaxAmount,
        bridgeMinAmount,
      }
    } catch (error) {
      throw new BSError('Failed to get bridge constants', 'BRIDGE_CONSTANTS_ERROR', error)
    }
  }

  async getApprovalFee(params: TNeo3NeoXBridgeServiceGetApprovalParam<TBSNeoXName>): Promise<string> {
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

      const signer = await this.#service._getSigner(params.account)
      const nonce = await signer.getNonce('pending')

      if (isNaN(nonce)) {
        throw new Error('Invalid nonce')
      }

      const approvedEstimated = await signer.estimateGas({ ...populatedApproveTransaction, chainId, nonce, type: 2 })
      const provider = new JsonRpcProvider(this.#service.network.url)
      const { gasPrice } = await provider.getFeeData()

      return new BSBigUnitAmount(gasPrice?.toString() || '0', BSEthereumConstants.DEFAULT_DECIMALS)
        .multipliedBy(approvedEstimated.toString())
        .toHuman()
        .toFormatted()
    } catch (error) {
      if (error instanceof BSError) {
        throw error
      }

      throw new BSError('Failed to get allowance fee', 'ALLOWANCE_FEE_ERROR', error)
    }
  }

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<TBSNeoXName>): Promise<string> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')
    }

    const signer = await this.#service._getSigner(params.account)
    const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const to: THexString = `0x${wallet.getScriptHashFromAddress(params.receiverAddress)}`
    const bridgeFee = new BSBigHumanAmount(params.bridgeFee, BSNeoXConstants.NATIVE_ASSET.decimals).toUnit().toString()
    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)
    const provider = new JsonRpcProvider(this.#service.network.url)
    const { gasPrice } = await provider.getFeeData()
    const gasPriceBn = new BSBigUnitAmount(gasPrice?.toString() || '0', BSEthereumConstants.DEFAULT_DECIMALS)

    const transactionParams: TransactionRequest = { type: 2 }

    if (isNativeToken) {
      const populatedTransactionParams = await bridgeContract.withdrawNative.populateTransaction(to, bridgeFee)
      const value = new BSBigHumanAmount(params.amount, params.token.decimals).toUnit().plus(bridgeFee).toString()

      Object.assign(transactionParams, populatedTransactionParams, { value })
    } else {
      const approveTransactionParam = await this.#buildApproveTransactionParam(params)

      if (approveTransactionParam) {
        const { transactionHash } = await this.#service._sendTransaction({
          signer,
          gasPriceBn,
          transactionParams: approveTransactionParam,
        })

        const provider = new JsonRpcProvider(this.#service.network.url)

        await provider.waitForTransaction(transactionHash)
      }

      const fixedAmount = new BSBigHumanAmount(params.amount, 0).toFormatted()
      const amount = new BSBigHumanAmount(fixedAmount, params.token.decimals).toUnit().toString()

      const populatedTransactionParams = await bridgeContract.withdrawToken.populateTransaction(
        params.token.hash,
        to,
        amount
      )

      Object.assign(transactionParams, populatedTransactionParams, { value: bridgeFee })
    }

    const { transactionHash } = await this.#service._sendTransaction({ signer, gasPriceBn, transactionParams })

    return transactionHash
  }

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<TBSNeoXName>): Promise<string> {
    const [transactionLogsResponse, transactionLogsResponseError] = await BSUtilsHelper.tryCatch(async () => {
      const client = BlockscoutBDSNeoX.getClient(this.#service.network)
      return await client.get<TNeo3NeoXBridgeServiceTransactionLogApiResponse>(
        `/transactions/${params.transactionHash}/logs`
      )
    })

    if (!transactionLogsResponse)
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', transactionLogsResponseError)

    const [nonce, nonceError] = await BSUtilsHelper.tryCatch(() => {
      const BridgeInterface = new Interface(BRIDGE_ABI)

      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

      const dataIndex = isNativeToken ? 0 : 1
      const log = transactionLogsResponse.data.items[dataIndex]
      const parsedLog = BridgeInterface.parseLog({
        data: log.data,
        topics: log.topics.filter(Boolean),
      })

      if (!parsedLog) return undefined

      const nonce = parsedLog.args.nonce

      return nonce !== undefined && nonce !== null ? nonce.toString() : undefined
    })

    if (!nonce) {
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', nonceError)
    }

    return nonce
  }

  async getTransactionHashByNonce(
    params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<TBSNeoXName>
  ): Promise<string> {
    try {
      let url: string

      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

      if (isNativeToken) {
        url = `${Neo3NeoXBridgeService.BRIDGE_BASE_CONFIRMATION_URL}/${params.nonce}`
      } else {
        url = `${Neo3NeoXBridgeService.BRIDGE_BASE_CONFIRMATION_URL}/${this.neoToken.hash}/${params.nonce}`
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

  getTokenByMultichainId(multichainId: string): TBridgeToken<TBSNeoXName> | undefined {
    const tokens = [this.gasToken, this.neoToken]
    return tokens.find(token => token.multichainId === multichainId)
  }

  getTransactionData(transaction: TTransactionBase): TNeo3NeoXBridgeTransactionData<TBSNeoXName> | undefined {
    return transaction.data?.neo3NeoxBridge ? transaction.data : undefined
  }
}
