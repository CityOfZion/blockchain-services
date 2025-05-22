import {
  Account,
  BalanceResponse,
  BSBigNumberHelper,
  BSError,
  BSUtilsHelper,
  Token,
} from '@cityofzion/blockchain-service'
import { BSNeoXConstants } from '../../constants/BSNeoXConstants'
import { BSNeoX } from '../../BSNeoX'
import { ethers } from 'ethers'
import { wallet } from '@cityofzion/neon-js'
import { BRIDGE_ABI } from '../../assets/abis/bridge'
import { BSEthereumConstants, BSEthereumTokenHelper, ERC20_ABI } from '@cityofzion/bs-ethereum'
import axios from 'axios'
import { BlockscoutBDSNeoX } from '../blockchain-data/BlockscoutBDSNeoX'
import { BSNeoXHelper } from '../../helpers/BSNeoXHelper'

export type ValidateBridgeToNeo3Param<BSName extends string> = {
  account: Account<BSName>
  neo3Address: string
  amount: string
  token: Token
  balances: BalanceResponse[]
}

export type ValidateBridgeToNeo3Result = {
  amount: string
  receiveAmount: string
  token: Token
  isGasToken?: boolean
  isNeoToken?: boolean
}

export type BridgeToNeo3Param<BSName extends string> = {
  account: Account<BSName>
  neo3Address: string
  validateResult: ValidateBridgeToNeo3Result
}

export type CalculateMaxAmountToBridgeToNeo3Param<BSName extends string> = {
  account: Account<BSName>
  neo3Address: string
  token: Token
  balances: BalanceResponse[]
}

export type WaitForBridgeToNeo3Params = {
  transactionHash: string
  neo3Service: any
  validateResult: ValidateBridgeToNeo3Result
}

export type GetBridgeToNeo3TransactionByNonceParams = {
  nonce: string
  validateResult: ValidateBridgeToNeo3Result
}

export class BridgeNeoXService<BSName extends string> {
  #service: BSNeoX<BSName>

  readonly BRIDGE_SCRIPT_HASH = '0x1212000000000000000000000000000000000004'
  readonly BRIDGE_GAS_FEE = 0.1
  readonly BRIDGE_MIN_AMOUNT = 1
  readonly BRIDGE_NEO_BRIDGE_TRANSACTION_FEE = 0.008

  constructor(service: BSNeoX<BSName>) {
    this.#service = service
  }

  async #buildGasBridgeParams(params: BridgeToNeo3Param<BSName>) {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

    const gasPrice = await provider.getGasPrice()

    const to = '0x' + wallet.getScriptHashFromAddress(params.neo3Address)
    const bridgeContract = new ethers.Contract(this.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const bridgeFee = ethers.utils.parseUnits(this.BRIDGE_GAS_FEE.toString(), BSNeoXConstants.NATIVE_ASSET.decimals)

    const populatedTransaction = await bridgeContract.populateTransaction.withdrawNative(to, bridgeFee)
    const bridgeTransactionParam: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      ...populatedTransaction,
      value: ethers.utils.parseUnits(params.validateResult.amount, params.validateResult.token.decimals),
      type: 2,
    }

    return {
      bridgeTransactionParam,
      approveTransactionParams: undefined, // No approval needed for GAS
      gasPrice,
    }
  }

  async #buildNeoBridgeParams(params: BridgeToNeo3Param<BSName>) {
    const { validateResult, account } = params
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

    const gasPrice = await provider.getGasPrice()

    const to = '0x' + wallet.getScriptHashFromAddress(params.neo3Address)
    const bridgeContract = new ethers.Contract(this.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const bridgeFee = ethers.utils.parseUnits(this.BRIDGE_GAS_FEE.toString(), BSNeoXConstants.NATIVE_ASSET.decimals)

    // We are using 0 as the decimals because the NEO token in Neo3 has 0 decimals
    const fixedAmount = BSBigNumberHelper.format(params.validateResult.amount, { decimals: 0 })
    const amount = ethers.utils.parseUnits(fixedAmount, params.validateResult.token.decimals)

    const erc20Contract = new ethers.Contract(BSNeoXConstants.NEO_TOKEN.hash, ERC20_ABI, provider)

    const allowance = await erc20Contract.allowance(account.address, this.BRIDGE_SCRIPT_HASH)
    const allowanceNumber = BSBigNumberHelper.fromDecimals(allowance.toString(), BSNeoXConstants.NEO_TOKEN.decimals)

    let approveTransactionParams: ethers.utils.Deferrable<ethers.providers.TransactionRequest> | undefined

    if (allowanceNumber.isLessThan(fixedAmount)) {
      const populatedApproveTransaction = await erc20Contract.populateTransaction.approve(
        this.BRIDGE_SCRIPT_HASH,
        amount
      )
      approveTransactionParams = {
        ...populatedApproveTransaction,
        type: 2,
      }
    }

    const populatedTransaction = await bridgeContract.populateTransaction.withdrawToken(
      validateResult.token.hash,
      to,
      amount
    )

    const bridgeTransactionParam: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      ...populatedTransaction,
      type: 2,
      value: bridgeFee,
    }

    return {
      bridgeTransactionParam,
      approveTransactionParams,
      gasPrice,
    }
  }

  async #buildBridgeParams(params: BridgeToNeo3Param<BSName>) {
    if (params.validateResult.isGasToken) {
      return this.#buildGasBridgeParams(params)
    } else if (params.validateResult.isNeoToken) {
      return this.#buildNeoBridgeParams(params)
    } else {
      throw new BSError('Invalid token for bridging', 'INVALID_TOKEN')
    }
  }

  async #validateGasBridgeToNeo3({
    amount,
    balances,
    token,
    account,
    neo3Address,
  }: ValidateBridgeToNeo3Param<BSName>): Promise<ValidateBridgeToNeo3Result> {
    const gasBalance = balances.find(balance =>
      BSEthereumTokenHelper.predicateByHash(balance.token)(BSNeoXConstants.NATIVE_ASSET)
    )
    if (!gasBalance) {
      throw new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(amount)
    const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)

    const validateResult = {
      receiveAmount: amountNumber.minus(this.BRIDGE_GAS_FEE).toString(),
      token,
      isGasToken: true,
      isNeoToken: false,
      amount,
    }

    if (amountNumber.isLessThan(this.BRIDGE_MIN_AMOUNT + this.BRIDGE_GAS_FEE)) {
      throw new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE')
    }

    const fee = await this.calculateBridgeToNeo3Fee({
      account,
      neo3Address,
      validateResult,
    })

    if (amountNumber.plus(fee).isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE')
    }

    return validateResult
  }

  async #validateNeoBridgeToNeo3({
    amount,
    balances,
    token,
    account,
    neo3Address,
  }: ValidateBridgeToNeo3Param<BSName>): Promise<ValidateBridgeToNeo3Result> {
    const gasBalance = balances.find(balance =>
      BSEthereumTokenHelper.predicateByHash(balance.token)(BSNeoXConstants.NATIVE_ASSET)
    )
    if (!gasBalance) {
      throw new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND')
    }

    const neoBalance = balances.find(balance =>
      BSEthereumTokenHelper.predicateByHash(balance.token)(BSNeoXConstants.NEO_TOKEN)
    )
    if (!neoBalance) {
      throw new BSError('NEO balance not found', 'NEO_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(amount)
    const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)
    const minGasBalanceNumber = BSBigNumberHelper.fromNumber(this.BRIDGE_GAS_FEE)

    const validateResult = { receiveAmount: amount, token, isNeoToken: true, amount, isGasToken: false }

    if (amountNumber.isLessThan(this.BRIDGE_MIN_AMOUNT)) {
      throw new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(neoBalance.amount)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE')
    }

    if (gasBalanceNumber.isLessThan(minGasBalanceNumber)) {
      throw new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE')
    }

    const fee = await this.calculateBridgeToNeo3Fee({
      account,
      neo3Address,
      validateResult,
    })

    if (minGasBalanceNumber.plus(fee).isGreaterThan(gasBalanceNumber)) {
      throw new BSError('GAS balance is less than fees', 'INSUFFICIENT_GAS_BALANCE_FEES')
    }

    return validateResult
  }

  async calculateMaxAmountToBridgeToNeoX({
    account,
    balances,
    neo3Address,
    token,
  }: CalculateMaxAmountToBridgeToNeo3Param<BSName>) {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSEthereumTokenHelper.normalizeToken(token)

    const selectedTokenBalance = balances.find(
      balance => BSEthereumTokenHelper.normalizeHash(balance.token.hash) === normalizedSelectedToken.hash
    )
    if (!selectedTokenBalance) {
      throw new BSError('Token balance not found', 'TOKEN_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(selectedTokenBalance.amount)
    const receiveAmount = amountNumber.minus(this.BRIDGE_MIN_AMOUNT).toString()

    const amount = amountNumber.toString()

    const isGasToken = normalizedSelectedToken.hash === BSNeoXConstants.NATIVE_ASSET.hash
    const isNeoToken = normalizedSelectedToken.hash === BSNeoXConstants.NEO_TOKEN.hash

    const fee = await this.calculateBridgeToNeo3Fee({
      account,
      neo3Address,
      validateResult: { receiveAmount, token, isGasToken, isNeoToken, amount },
    })

    const maxAmount = amountNumber.minus(fee).toString()

    return maxAmount
  }

  async calculateBridgeToNeo3Fee(params: BridgeToNeo3Param<BSName>) {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const signer = await this.#service.generateSigner(params.account)
      const { gasPrice, approveTransactionParams, bridgeTransactionParam } = await this.#buildBridgeParams(params)

      let fee = ethers.utils.parseEther('0')

      if (params.validateResult.isGasToken) {
        const estimated = await signer.estimateGas(bridgeTransactionParam)
        fee = gasPrice.mul(estimated)
      } else {
        let approvedEstimated = ethers.utils.parseEther('0')

        if (approveTransactionParams) {
          approvedEstimated = await signer.estimateGas(approveTransactionParams!)
        }

        // We can't estimate the gas for the bridge transaction because it requires the approve transaction to be done first
        // if not the gas estimation of bridge transaction will fail so we add a fixed value
        const neoBridgeFee = ethers.utils.parseUnits(
          this.BRIDGE_NEO_BRIDGE_TRANSACTION_FEE.toString(),
          BSNeoXConstants.NATIVE_ASSET.decimals
        )

        fee = gasPrice.mul(approvedEstimated).add(neoBridgeFee)
      }

      return ethers.utils.formatEther(fee)
    } catch (error: any) {
      throw new BSError(error.message, 'FEE_CALCULATION_ERROR')
    }
  }

  async bridgeToNeo3(params: BridgeToNeo3Param<BSName>) {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account, validateResult } = params

    if (!validateResult.isGasToken && !validateResult.isNeoToken) {
      throw new BSError('Invalid token for bridging', 'INVALID_TOKEN')
    }
    const signer = await this.#service.generateSigner(account)

    const { approveTransactionParams, bridgeTransactionParam, gasPrice } = await this.#buildBridgeParams(params)

    if (approveTransactionParams) {
      const approveTransaction = await signer.sendTransaction(approveTransactionParams)
      await approveTransaction.wait()
    }

    let gasLimit: ethers.BigNumberish
    try {
      gasLimit = await signer.estimateGas(bridgeTransactionParam)
    } catch {
      gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT
    }

    const transaction = await signer.sendTransaction({
      ...bridgeTransactionParam,
      gasLimit,
      maxPriorityFeePerGas: gasPrice,
      maxFeePerGas: gasPrice,
    })
    return transaction.hash
  }

  async validateBridgeToNeo3(params: ValidateBridgeToNeo3Param<BSName>): Promise<ValidateBridgeToNeo3Result> {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSEthereumTokenHelper.normalizeToken(params.token)

    const isGasToken = normalizedSelectedToken.hash === BSNeoXConstants.NATIVE_ASSET.hash
    const isNeoToken = normalizedSelectedToken.hash === BSNeoXConstants.NEO_TOKEN.hash

    if (isGasToken) {
      return this.#validateGasBridgeToNeo3(params)
    } else if (isNeoToken) {
      return this.#validateNeoBridgeToNeo3(params)
    } else {
      throw new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN')
    }
  }

  async getBridgeToNeo3TransactionByNonce(params: GetBridgeToNeo3TransactionByNonceParams) {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { nonce, validateResult } = params

    let url = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'

    if (validateResult.isNeoToken) {
      url += `/${BSNeoXConstants.NEO_TOKEN.hash}/${nonce}`
    } else {
      url += `/${nonce}`
    }

    const response = await axios.get<{ txid: string | null }>(url)

    if (!response.data?.txid) {
      throw new BSError('Transaction not found', 'TRANSACTION_NOT_FOUND')
    }

    return response.data.txid
  }

  async waitForBridgeToNeoX(params: WaitForBridgeToNeo3Params) {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { transactionHash, neo3Service, validateResult } = params

      let nonce: string

      const log = await BSUtilsHelper.retry(
        async () => {
          const client = BlockscoutBDSNeoX.getClient(this.#service.network)
          const { data } = await client.get<{ items: { data: string; topics: any[] }[] }>(
            `/transactions/${transactionHash}/logs`
          )

          if (!data.items || data.items.length === 0) {
            throw new BSError('Transaction logs not found', 'LOGS_NOT_FOUND')
          }

          return data
        },
        {
          retries: 10,
          delay: 30000,
        }
      )

      const BridgeInterface = new ethers.utils.Interface(BRIDGE_ABI)
      if (validateResult.isGasToken) {
        const response = BridgeInterface.decodeEventLog(
          'NativeWithdrawal',
          log.items[0].data,
          log.items[0].topics.filter(Boolean)
        )
        nonce = response.nonce.toString()
      } else {
        const response = BridgeInterface.decodeEventLog(
          'TokenWithdrawal',
          log.items[1].data,
          log.items[1].topics.filter(Boolean)
        )
        nonce = response.nonce.toString()
      }

      console.log('Nonce:', nonce)

      if (!nonce) {
        throw new Error()
      }

      await neo3Service.bridgeService.getBridgeToNeoXTransactionByNonce({ nonce, validateResult })

      return true
    } catch (error: any) {
      console.log(error)
      return false
    }
  }
}
