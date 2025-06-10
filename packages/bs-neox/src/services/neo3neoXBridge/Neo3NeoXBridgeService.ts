import {
  BSBigNumberHelper,
  BSError,
  BSTokenHelper,
  BSUtilsHelper,
  INeo3NeoXBridgeService,
  TNeo3NeoXBridgeServiceBridgeParam,
  TNeo3NeoXBridgeServiceCalculateMaxAmountParams,
  TNeo3NeoXBridgeServiceValidatedInputs,
  TNeo3NeoXBridgeServiceValidateInputParams,
  TNeo3NeoXBridgeServiceWaitParams,
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

type TBlockscoutTransactionLogResponse = { items: { data: string; topics: any[] }[] }

type TGetBridgeTxByNonceResponse = { result: { Vmstate: string; txid: string } }

export class Neo3NeoXBridgeService<BSName extends string> implements INeo3NeoXBridgeService<BSName> {
  readonly BRIDGE_SCRIPT_HASH = '0x1212000000000000000000000000000000000004'
  readonly BRIDGE_GAS_FEE = 0.1
  readonly BRIDGE_MIN_AMOUNT = 1
  readonly BRIDGE_NEO_BRIDGE_TRANSACTION_FEE = 0.008
  readonly BRIDGE_NEO3_NEO_TOKEN_HASH = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'

  readonly #service: BSNeoX<BSName>

  constructor(service: BSNeoX<BSName>) {
    this.#service = service
  }

  async #buildGasTransactionParams(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>) {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

    const gasPrice = await provider.getGasPrice()

    const to = '0x' + wallet.getScriptHashFromAddress(params.receiverAddress)
    const bridgeContract = new ethers.Contract(this.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const bridgeFee = ethers.utils.parseUnits(this.BRIDGE_GAS_FEE.toString(), BSNeoXConstants.NATIVE_ASSET.decimals)

    const populatedTransaction = await bridgeContract.populateTransaction.withdrawNative(to, bridgeFee)
    const bridgeTransactionParam: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
      ...populatedTransaction,
      value: ethers.utils.parseUnits(params.validatedInputs.amount, params.validatedInputs.token.decimals),
      type: 2,
    }

    return {
      bridgeTransactionParam,
      approveTransactionParams: undefined, // No approval needed for GAS
      gasPrice,
    }
  }

  async #buildNeoTransactionParams(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>) {
    const provider = new ethers.providers.JsonRpcProvider(this.#service.network.url)

    const gasPrice = await provider.getGasPrice()

    const to = '0x' + wallet.getScriptHashFromAddress(params.receiverAddress)
    const bridgeContract = new ethers.Contract(this.BRIDGE_SCRIPT_HASH, BRIDGE_ABI)
    const bridgeFee = ethers.utils.parseUnits(this.BRIDGE_GAS_FEE.toString(), BSNeoXConstants.NATIVE_ASSET.decimals)

    // We are using 0 as the decimals because the NEO token in Neo3 has 0 decimals
    const fixedAmount = BSBigNumberHelper.format(params.validatedInputs.amount, { decimals: 0 })
    const amount = ethers.utils.parseUnits(fixedAmount, params.validatedInputs.token.decimals)

    const erc20Contract = new ethers.Contract(BSNeoXConstants.NEO_TOKEN.hash, ERC20_ABI, provider)

    const allowance = await erc20Contract.allowance(params.account.address, this.BRIDGE_SCRIPT_HASH)
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
      params.validatedInputs.token.hash,
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

  async #buildTransactionParams(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>) {
    const isGasToken = BSTokenHelper.predicateByHash(params.validatedInputs.token)(BSNeoXConstants.NATIVE_ASSET)
    if (isGasToken) {
      return this.#buildGasTransactionParams(params)
    }

    return this.#buildNeoTransactionParams(params)
  }

  async #validateGas({
    amount,
    balances,
    token,
    account,
    receiverAddress,
  }: TNeo3NeoXBridgeServiceValidateInputParams<BSName>): Promise<TNeo3NeoXBridgeServiceValidatedInputs> {
    const gasBalance = balances.find(balance =>
      BSEthereumTokenHelper.predicateByHash(balance.token)(BSNeoXConstants.NATIVE_ASSET)
    )
    if (!gasBalance) {
      throw new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(amount)
    const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)

    const validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs = {
      receiveAmount: amountNumber.minus(this.BRIDGE_GAS_FEE).toString(),
      token,
      amount,
    }

    if (amountNumber.isLessThan(this.BRIDGE_MIN_AMOUNT + this.BRIDGE_GAS_FEE)) {
      throw new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE')
    }

    const fee = await this.calculateFee({
      account,
      receiverAddress,
      validatedInputs,
    })

    if (amountNumber.plus(fee).isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE')
    }

    return validatedInputs
  }

  async #validateNeo({
    amount,
    balances,
    token,
    account,
    receiverAddress,
  }: TNeo3NeoXBridgeServiceValidateInputParams<BSName>): Promise<TNeo3NeoXBridgeServiceValidatedInputs> {
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

    const validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs = { receiveAmount: amount, token, amount }

    if (amountNumber.isLessThan(this.BRIDGE_MIN_AMOUNT)) {
      throw new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(neoBalance.amount)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE')
    }

    if (gasBalanceNumber.isLessThan(minGasBalanceNumber)) {
      throw new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE')
    }

    const fee = await this.calculateFee({
      account,
      receiverAddress,
      validatedInputs,
    })

    if (minGasBalanceNumber.plus(fee).isGreaterThan(gasBalanceNumber)) {
      throw new BSError('GAS balance is less than fees', 'INSUFFICIENT_GAS_BALANCE_FEES')
    }

    return validatedInputs
  }

  async calculateMaxAmount({
    account,
    balances,
    receiverAddress,
    token,
  }: TNeo3NeoXBridgeServiceCalculateMaxAmountParams<BSName>) {
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

    const fee = await this.calculateFee({
      account,
      receiverAddress,
      validatedInputs: { receiveAmount, token, amount },
    })

    const maxAmount = amountNumber.minus(fee).toString()

    return maxAmount
  }

  async calculateFee(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string> {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const signer = await this.#service.generateSigner(params.account)
      const { gasPrice, approveTransactionParams, bridgeTransactionParam } = await this.#buildTransactionParams(params)

      let fee = ethers.utils.parseEther('0')

      const isGasToken = BSTokenHelper.predicateByHash(params.validatedInputs.token)(BSNeoXConstants.NATIVE_ASSET)

      if (isGasToken) {
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

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string> {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account } = params

    const signer = await this.#service.generateSigner(account)

    const { approveTransactionParams, bridgeTransactionParam, gasPrice } = await this.#buildTransactionParams(params)

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

  async validateInputs(
    params: TNeo3NeoXBridgeServiceValidateInputParams<BSName>
  ): Promise<TNeo3NeoXBridgeServiceValidatedInputs> {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSEthereumTokenHelper.normalizeToken(params.token)

    const isGasToken = normalizedSelectedToken.hash === BSNeoXConstants.NATIVE_ASSET.hash
    const isNeoToken = normalizedSelectedToken.hash === BSNeoXConstants.NEO_TOKEN.hash

    if (isGasToken) {
      return this.#validateGas(params)
    } else if (isNeoToken) {
      return this.#validateNeo(params)
    } else {
      throw new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN')
    }
  }

  async wait(params: TNeo3NeoXBridgeServiceWaitParams): Promise<boolean> {
    if (!BSNeoXHelper.isMainnet(this.#service.network))
      throw new BSError('Bridging to Neo3 is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { transactionHash, validatedInputs } = params

      let nonce: string

      const log = await BSUtilsHelper.retry(
        async () => {
          const client = BlockscoutBDSNeoX.getClient(this.#service.network)
          const { data } = await client.get<TBlockscoutTransactionLogResponse>(`/transactions/${transactionHash}/logs`)

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

      const isGasToken = BSTokenHelper.predicateByHash(validatedInputs.token)(BSNeoXConstants.NATIVE_ASSET)

      if (isGasToken) {
        const item = log.items[0]
        const response = BridgeInterface.decodeEventLog('NativeWithdrawal', item.data, item.topics.filter(Boolean))
        nonce = response.nonce.toString()
      } else {
        const item = log.items[1]
        const response = BridgeInterface.decodeEventLog('TokenWithdrawal', item.data, item.topics.filter(Boolean))
        nonce = response.nonce.toString()
      }

      if (!nonce) {
        throw new Error()
      }

      await BSUtilsHelper.retry(
        async () => {
          const response = await axios.post<TGetBridgeTxByNonceResponse>('https://neofura.ngd.network', {
            jsonrpc: '2.0',
            method: 'GetBridgeTxByNonce',
            params: {
              ContractHash: this.BRIDGE_SCRIPT_HASH,
              TokenHash: isGasToken ? '' : this.BRIDGE_NEO3_NEO_TOKEN_HASH,
              Nonce: Number(nonce),
            },
            id: 1,
          })

          if (!response.data?.result.Vmstate || !response.data?.result.txid) {
            throw new BSError('Transaction not found', 'TRANSACTION_NOT_FOUND')
          }

          if (response.data.result.Vmstate !== 'HALT') {
            throw new BSError('Transaction is not in a valid state', 'INVALID_TRANSACTION_STATE')
          }
        },
        {
          retries: 10,
          delay: 30000,
        }
      )

      return true
    } catch (error: any) {
      return false
    }
  }
}
