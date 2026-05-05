import {
  BSBigHumanAmount,
  BSBigUnitAmount,
  BSError,
  BSUtilsHelper,
  INeo3NeoXBridgeService,
  TBridgeToken,
  TBridgeTokenMultichainId,
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
import { ethers } from 'ethers'
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
  static readonly BRIDGE_BASE_CONFIRMATION_URL = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'

  readonly gasToken: TBridgeToken<TBSNeoXName>
  readonly neoToken: TBridgeToken<TBSNeoXName>
  readonly ndmemeToken: TBridgeToken<TBSNeoXName>
  readonly tokens: TBridgeToken<TBSNeoXName>[]

  readonly #service: IBSNeoX

  constructor(service: IBSNeoX) {
    this.#service = service

    const neoToken = BSNeoXHelper.getNeoToken(this.#service.network)

    this.gasToken = { ...BSNeoXConstants.NATIVE_ASSET, blockchain: service.name, multichainId: 'gas' }
    this.neoToken = { ...neoToken, blockchain: service.name, multichainId: 'neo' }
    this.ndmemeToken = {
      ...BSNeoXConstants.NDMEME_TOKEN,
      blockchain: service.name,
      multichainId: 'ndmeme',
    }
    this.tokens = [this.gasToken, this.neoToken, this.ndmemeToken]
  }

  async #buildApproveTransactionParam(params: TNeo3NeoXBridgeServiceGetApprovalParam<TBSNeoXName>) {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
    const erc20Contract = new ethers.Contract(params.token.hash, ERC20_ABI, provider)

    const allowance = await erc20Contract.allowance(params.account.address, Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH)
    const allowanceNumber = new BSBigUnitAmount(allowance.toString(), this.neoToken.decimals)

    // We are using 0 as the decimals because the NEO token in Neo3 has 0 decimals
    const fixedAmount = new BSBigHumanAmount(params.amount, 0).toFormatted()
    const amount = new BSBigHumanAmount(fixedAmount, params.token.decimals).toUnit().toFixed()

    if (allowanceNumber.isGreaterThanOrEqualTo(amount)) {
      return null
    }

    return await erc20Contract.populateTransaction.approve(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, amount)
  }

  _getDataFromBlockscoutTransaction(
    response: TBlockscoutBDSNeoXTransactionApiResponse
  ): TNeo3NeoXBridgeTransactionData<TBSNeoXName> | undefined {
    if (response.to.hash.toLowerCase() !== Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH.toLowerCase()) {
      return undefined
    }

    const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)
    const input = BridgeInterface.parseTransaction({ data: response.raw_input })

    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()

    const to = input.args._to
    const receiverAddress = wallet.getAddressFromScriptHash(to.startsWith('0x') ? to.slice(2) : to)

    let tokenToUse: TBridgeToken<TBSNeoXName> | undefined
    let amount: string | undefined

    if (input.name === 'withdrawNative') {
      tokenToUse = this.gasToken
      amount = new BSBigUnitAmount(response.value, tokenToUse.decimals)
        .minus(input.args._maxFee.toString())
        .toHuman()
        .toFormatted()
    } else if (input.name === 'withdrawToken') {
      const tokenHash: string = input.args._neoXToken

      tokenToUse = this.tokens.find(token => this.#service.tokenService.predicateByHash(tokenHash, token))

      if (tokenToUse) {
        amount = new BSBigUnitAmount(input.args._amount.toString(), tokenToUse.decimals).toHuman().toFormatted()
      }
    }

    if (!tokenToUse || !amount) return undefined

    const multichainIdToReceive: TBridgeTokenMultichainId = tokenToUse.multichainId

    return { neo3NeoxBridge: { tokenToUse, multichainIdToReceive, receiverAddress, amount } }
  }

  async getBridgeConstants(token: TBridgeToken<TBSNeoXName>): Promise<TNeo3NeoXBridgeServiceConstants> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
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

      const signer = await this.#service._generateSigner(params.account)
      const nonce = await signer.getTransactionCount('pending')

      if (isNaN(nonce)) {
        throw new Error('Invalid nonce')
      }

      const approvedEstimated = await signer.estimateGas({ ...populatedApproveTransaction, chainId, nonce, type: 2 })
      const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)
      const gasPrice = await provider.getGasPrice()

      return new BSBigUnitAmount(gasPrice.toString(), BSEthereumConstants.DEFAULT_DECIMALS)
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

    const signer = await this.#service._generateSigner(params.account)
    const bridgeContract = new ethers.Contract(Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const { wallet } = BSNeo3NeonJsSingletonHelper.getInstance()
    const to: THexString = `0x${wallet.getScriptHashFromAddress(params.receiverAddress)}`
    const bridgeFee = new BSBigHumanAmount(params.bridgeFee, BSNeoXConstants.NATIVE_ASSET.decimals).toUnit().toFixed()
    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeoXConstants.NATIVE_ASSET)

    const gasPrice = await signer.getGasPrice()
    const gasPriceBn = new BSBigUnitAmount(gasPrice.toString(), BSEthereumConstants.DEFAULT_DECIMALS)

    const transactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = { type: 2 }

    if (isNativeToken) {
      const populatedTransactionParams = await bridgeContract.populateTransaction.withdrawNative(to, bridgeFee)

      const value = new BSBigHumanAmount(params.amount, params.token.decimals).toUnit().plus(bridgeFee).toFixed()
      Object.assign(transactionParams, populatedTransactionParams, { value })
    } else {
      const approveTransactionParam = await this.#buildApproveTransactionParam(params)

      if (approveTransactionParam) {
        const { transactionHash } = await this.#service._sendTransaction({
          signer,
          gasPriceBn,
          transactionParams: approveTransactionParam,
        })

        const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

        await provider.waitForTransaction(transactionHash)
      }

      const fixedAmount = new BSBigHumanAmount(params.amount, 0).toFormatted()
      const amount = new BSBigHumanAmount(fixedAmount, params.token.decimals).toUnit().toFixed()

      const populatedTransactionParams = await bridgeContract.populateTransaction.withdrawToken(
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

    const [nonce, nonceError] = await BSUtilsHelper.tryCatch(async () => {
      const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)

      for (const log of transactionLogsResponse.data.items) {
        const [parsedNonce] = await BSUtilsHelper.tryCatch(() => {
          const parsedLog = BridgeInterface.parseLog({ data: log.data, topics: log.topics.filter(Boolean) })
          return parsedLog.args.nonce ? parsedLog.args.nonce.toString() : undefined
        })

        if (parsedNonce) return parsedNonce
      }
      return undefined
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
        url = `${Neo3NeoXBridgeService.BRIDGE_BASE_CONFIRMATION_URL}/${params.token.hash}/${params.nonce}`
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
    return this.tokens.find(token => token.multichainId === multichainId)
  }

  getTransactionData(transaction: TTransactionBase): TNeo3NeoXBridgeTransactionData<TBSNeoXName> | undefined {
    return transaction.data?.neo3NeoxBridge ? transaction.data : undefined
  }
}
