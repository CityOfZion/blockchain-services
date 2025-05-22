import {
  Account,
  BalanceResponse,
  BSBigNumberHelper,
  BSError,
  BSTokenHelper,
  BSUtilsHelper,
  Token,
} from '@cityofzion/blockchain-service'
import Neon from '@cityofzion/neon-core'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import { BSNeo3 } from '../../BSNeo3'
import type { ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { DoraNeoRest } from '../blockchain-data/DoraBDSNeo3'
import axios from 'axios'

export type ValidateBridgeToNeoXResult = {
  amount: string
  receiveAmount: string
  token: Token
  isGasToken?: boolean
  isNeoToken?: boolean
}

export type BridgeToNeoXParam<BSName extends string> = {
  account: Account<BSName>
  neoXAddress: string
  validateResult: ValidateBridgeToNeoXResult
}

export type ValidateBridgeToNeoXParam<BSName extends string> = {
  account: Account<BSName>
  neoXAddress: string
  amount: string
  token: Token
  balances: BalanceResponse[]
}

export type CalculateMaxAmountToBridgeToNeoXParam<BSName extends string> = {
  account: Account<BSName>
  neoXAddress: string
  token: Token
  balances: BalanceResponse[]
}

export type WaitForBridgeToNeoXParams = {
  transactionHash: string
  neoXService: any
  validateResult: ValidateBridgeToNeoXResult
}

export type GetBridgeToNeoXTransactionByNonceParams = {
  nonce: string
  validateResult: ValidateBridgeToNeoXResult
}

export class BridgeNeo3Service<BSName extends string = string> {
  #service: BSNeo3<BSName>

  constructor(service: BSNeo3<BSName>) {
    this.#service = service
  }

  #buildGasBridgeToNeoXInvocations(
    { neoXAddress, validateResult }: BridgeToNeoXParam<BSName>,
    neonJsAccount: Neon.wallet.Account
  ): ContractInvocationMulti {
    return {
      invocations: [
        {
          scriptHash: BSNeo3Constants.BRIDGE_SCRIPT_HASH,
          operation: 'depositNative',
          args: [
            { type: 'Hash160', value: neonJsAccount.address },
            { type: 'Hash160', value: neoXAddress },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(validateResult.receiveAmount),
                validateResult.token.decimals
              ),
            },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(BSNeo3Constants.BRIDGE_GAS_FEE),
                BSNeo3Constants.GAS_TOKEN.decimals
              ),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [BSNeo3Constants.BRIDGE_SCRIPT_HASH, BSNeo3Constants.GAS_TOKEN.hash],
        },
      ],
    }
  }

  #buildNeoBridgeToNeoXInvocations(
    { neoXAddress, validateResult }: BridgeToNeoXParam<BSName>,
    neonJsAccount: Neon.wallet.Account
  ): ContractInvocationMulti {
    return {
      invocations: [
        {
          scriptHash: BSNeo3Constants.BRIDGE_SCRIPT_HASH,
          operation: 'depositToken',
          args: [
            { type: 'Hash160', value: BSNeo3Constants.NEO_TOKEN.hash },
            { type: 'Hash160', value: neonJsAccount.scriptHash },
            { type: 'Hash160', value: neoXAddress },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(validateResult.receiveAmount),
                validateResult.token.decimals
              ),
            },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(BSNeo3Constants.BRIDGE_GAS_FEE),
                BSNeo3Constants.GAS_TOKEN.decimals
              ),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [
            BSNeo3Constants.BRIDGE_SCRIPT_HASH,
            BSNeo3Constants.GAS_TOKEN.hash,
            BSNeo3Constants.NEO_TOKEN.hash,
          ],
        },
      ],
    }
  }

  #buildBridgeToNeoXInvocations(params: BridgeToNeoXParam<BSName>, neonJsAccount: Neon.wallet.Account) {
    if (params.validateResult.isGasToken) {
      return this.#buildGasBridgeToNeoXInvocations(params, neonJsAccount)
    } else if (params.validateResult.isNeoToken) {
      return this.#buildNeoBridgeToNeoXInvocations(params, neonJsAccount)
    } else {
      throw new BSError('Invalid token for bridging', 'INVALID_TOKEN')
    }
  }

  async #validateGasBridgeToNeoX({
    amount,
    balances,
    token,
    account,
    neoXAddress,
  }: ValidateBridgeToNeoXParam<BSName>): Promise<ValidateBridgeToNeoXResult> {
    const gasBalance = balances.find(balance => BSTokenHelper.predicateByHash(balance.token)(BSNeo3Constants.GAS_TOKEN))

    if (!gasBalance) {
      throw new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(amount)
    const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)

    const validateResult = {
      receiveAmount: amountNumber.minus(BSNeo3Constants.BRIDGE_GAS_FEE).toString(),
      token,
      isGasToken: true,
      isNeoToken: false,
      amount,
    }

    if (amountNumber.isLessThan(BSNeo3Constants.BRIDGE_MIN_AMOUNT + BSNeo3Constants.BRIDGE_GAS_FEE)) {
      throw new BSError('Amount is less than the minimum amount plus bridge fee', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_GAS_BALANCE')
    }

    const fee = await this.calculateBridgeToNeoXFee({
      account,
      neoXAddress,
      validateResult,
    })

    if (amountNumber.plus(fee).isGreaterThan(gasBalanceNumber)) {
      throw new BSError('Amount is greater than your balance plus fee', 'INSUFFICIENT_GAS_BALANCE_FEE')
    }

    return validateResult
  }

  async #validateNeoBridgeToNeoX({
    amount,
    balances,
    token,
    account,
    neoXAddress,
  }: ValidateBridgeToNeoXParam<BSName>): Promise<ValidateBridgeToNeoXResult> {
    const gasBalance = balances.find(balance => BSTokenHelper.predicateByHash(balance.token)(BSNeo3Constants.GAS_TOKEN))
    if (!gasBalance) {
      throw new BSError('GAS is necessary to bridge', 'GAS_BALANCE_NOT_FOUND')
    }

    const neoBalance = balances.find(balance => BSTokenHelper.predicateByHash(balance.token)(BSNeo3Constants.NEO_TOKEN))
    if (!neoBalance) {
      throw new BSError('NEO balance not found', 'NEO_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(amount)
    const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)
    const minGasBalanceNumber = BSBigNumberHelper.fromNumber(BSNeo3Constants.BRIDGE_GAS_FEE)

    const validateResult = { receiveAmount: amount, token, isNeoToken: true, amount, isGasToken: false }

    if (amountNumber.isLessThan(BSNeo3Constants.BRIDGE_MIN_AMOUNT)) {
      throw new BSError('Amount is less than the minimum amount', 'AMOUNT_TOO_LOW')
    }

    if (amountNumber.isGreaterThan(neoBalance.amount)) {
      throw new BSError('Amount is greater than your balance', 'INSUFFICIENT_NEO_BALANCE')
    }

    if (gasBalanceNumber.isLessThan(minGasBalanceNumber)) {
      throw new BSError('GAS balance is less than bridge fee', 'INSUFFICIENT_GAS_BALANCE_BRIDGE_FEE')
    }

    const fee = await this.calculateBridgeToNeoXFee({
      account,
      neoXAddress,
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
    neoXAddress,
    token,
  }: CalculateMaxAmountToBridgeToNeoXParam<BSName>) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSTokenHelper.normalizeToken(token)

    const selectedTokenBalance = balances.find(
      balance => BSTokenHelper.normalizeHash(balance.token.hash) === normalizedSelectedToken.hash
    )
    if (!selectedTokenBalance) {
      throw new BSError('Token balance not found', 'TOKEN_BALANCE_NOT_FOUND')
    }

    const amountNumber = BSBigNumberHelper.fromNumber(selectedTokenBalance.amount)

    const validateResult = {
      receiveAmount: amountNumber.minus(BSNeo3Constants.BRIDGE_MIN_AMOUNT).toString(),
      token,
      isGasToken: normalizedSelectedToken.hash === BSNeo3Constants.GAS_TOKEN.hash,
      isNeoToken: normalizedSelectedToken.hash === BSNeo3Constants.NEO_TOKEN.hash,
      amount: amountNumber.toString(),
    }

    const fee = await this.calculateBridgeToNeoXFee({
      account,
      neoXAddress,
      validateResult,
    })

    const maxAmount = amountNumber.minus(fee).toString()

    return maxAmount
  }

  async calculateBridgeToNeoXFee(params: BridgeToNeoXParam<BSName>) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { account, validateResult } = params

      if (!validateResult.isGasToken && !validateResult.isNeoToken) {
        throw new BSError('Invalid token for bridging', 'INVALID_TOKEN')
      }

      const { neonJsAccount } = await this.#service.generateSigningCallback(account)

      const invoker = await NeonInvoker.init({
        rpcAddress: this.#service.network.url,
        account: neonJsAccount,
      })

      const contractInvocation = this.#buildBridgeToNeoXInvocations(params, neonJsAccount)

      const { total } = await invoker.calculateFee(contractInvocation)

      return total.toString()
    } catch (error: any) {
      throw new BSError(error.message, 'FEE_CALCULATION_ERROR')
    }
  }

  async bridgeToNeoX(params: BridgeToNeoXParam<BSName>) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account, validateResult } = params

    if (!validateResult.isGasToken && !validateResult.isNeoToken) {
      throw new BSError('Invalid token for bridging', 'INVALID_TOKEN')
    }

    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(account)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const contractInvocation = this.#buildBridgeToNeoXInvocations(params, neonJsAccount)

    const transactionHash = await invoker.invokeFunction(contractInvocation)

    return transactionHash
  }

  async validateBridgeToNeoX(params: ValidateBridgeToNeoXParam<BSName>): Promise<ValidateBridgeToNeoXResult> {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSTokenHelper.normalizeToken(params.token)

    const isGasToken = normalizedSelectedToken.hash === BSNeo3Constants.GAS_TOKEN.hash
    const isNeoToken = normalizedSelectedToken.hash === BSNeo3Constants.NEO_TOKEN.hash

    if (isGasToken) {
      return this.#validateGasBridgeToNeoX(params)
    } else if (isNeoToken) {
      return this.#validateNeoBridgeToNeoX(params)
    } else {
      throw new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN')
    }
  }

  async getBridgeToNeoXTransactionByNonce({ nonce, validateResult }: GetBridgeToNeoXTransactionByNonceParams) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const url = 'https://neofura.ngd.network'
    const response = await axios.post<{ result: { Vmstate: string; txid: string } }>(url, {
      jsonrpc: '2.0',
      method: 'GetBridgeTxByNonce',
      params: {
        ContractHash: BSNeo3Constants.BRIDGE_SCRIPT_HASH,
        TokenHash: validateResult.isGasToken ? '' : BSNeo3Constants.NEO_TOKEN.hash,
        Nonce: Number(nonce),
      },
      id: 1,
    })

    console.log(response.data)

    if (!response.data?.result.Vmstate || !response.data?.result.txid) {
      throw new BSError('Transaction not found', 'TRANSACTION_NOT_FOUND')
    }

    if (response.data.result.Vmstate !== 'HALT') {
      throw new BSError('Transaction is not in a valid state', 'INVALID_TRANSACTION_STATE')
    }

    return response.data.result.txid
  }

  async waitForBridgeToNeoX(params: WaitForBridgeToNeoXParams) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { transactionHash, neoXService, validateResult } = params

      let nonce: string

      const log = await BSUtilsHelper.retry(() => DoraNeoRest.log(transactionHash, this.#service.network.id), {
        retries: 10,
        delay: 30000,
      })

      if (log.vmstate !== 'HALT') {
        throw new Error()
      }

      if (validateResult.isGasToken) {
        const notification = log.notifications.find(item => item.event_name === 'NativeDeposit')
        console.log(notification)
        nonce = notification?.state.value[0].value
      } else {
        const notification = log.notifications.find(item => item.event_name === 'TokenDeposit')
        nonce = notification?.state.value[2].value
      }

      if (!nonce) {
        throw new Error()
      }

      await BSUtilsHelper.retry(
        () => neoXService.bridgeService.getBridgeToNeo3TransactionByNonce({ nonce, validateResult }),
        {
          retries: 10,
          delay: 30000,
        }
      )

      return true
    } catch (error: any) {
      console.log(error)
      return false
    }
  }
}
