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
import Neon from '@cityofzion/neon-core'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import { BSNeo3 } from '../../BSNeo3'
import type { ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { DoraNeoRest } from '../blockchain-data/DoraBDSNeo3'
import axios from 'axios'

export class Neo3NeoXBridgeService<BSName extends string = string> implements INeo3NeoXBridgeService<BSName> {
  readonly BRIDGE_SCRIPT_HASH = '0xbb19cfc864b73159277e1fd39694b3fd5fc613d2'
  readonly BRIDGE_GAS_FEE = 0.1
  readonly BRIDGE_MIN_AMOUNT = 1
  readonly BRIDGE_NEOX_BASE_CONFIRMATION_URL = 'https://xexplorer.neo.org:8877/api/v1/transactions/deposits'
  readonly BRIDGE_NEOX_NEO_TOKEN_HASH = '0xc28736dc83f4fd43d6fb832Fd93c3eE7bB26828f'

  readonly #service: BSNeo3<BSName>

  constructor(service: BSNeo3<BSName>) {
    this.#service = service
  }

  #buildGasCIM(
    { receiverAddress, validatedInputs }: TNeo3NeoXBridgeServiceBridgeParam<BSName>,
    neonJsAccount: Neon.wallet.Account
  ): ContractInvocationMulti {
    return {
      invocations: [
        {
          scriptHash: this.BRIDGE_SCRIPT_HASH,
          operation: 'depositNative',
          args: [
            { type: 'Hash160', value: neonJsAccount.address },
            { type: 'Hash160', value: receiverAddress },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(validatedInputs.receiveAmount),
                validatedInputs.token.decimals
              ),
            },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(this.BRIDGE_GAS_FEE),
                BSNeo3Constants.GAS_TOKEN.decimals
              ),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [this.BRIDGE_SCRIPT_HASH, BSNeo3Constants.GAS_TOKEN.hash],
        },
      ],
    }
  }

  #buildNeoCIM(
    { receiverAddress, validatedInputs }: TNeo3NeoXBridgeServiceBridgeParam<BSName>,
    neonJsAccount: Neon.wallet.Account
  ): ContractInvocationMulti {
    return {
      invocations: [
        {
          scriptHash: this.BRIDGE_SCRIPT_HASH,
          operation: 'depositToken',
          args: [
            { type: 'Hash160', value: BSNeo3Constants.NEO_TOKEN.hash },
            { type: 'Hash160', value: neonJsAccount.scriptHash },
            { type: 'Hash160', value: receiverAddress },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(validatedInputs.receiveAmount),
                validatedInputs.token.decimals
              ),
            },
            {
              type: 'Integer',
              value: BSBigNumberHelper.toDecimals(
                BSBigNumberHelper.fromNumber(this.BRIDGE_GAS_FEE),
                BSNeo3Constants.GAS_TOKEN.decimals
              ),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 16,
          allowedContracts: [this.BRIDGE_SCRIPT_HASH, BSNeo3Constants.GAS_TOKEN.hash, BSNeo3Constants.NEO_TOKEN.hash],
        },
      ],
    }
  }

  #buildCIM(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>, neonJsAccount: Neon.wallet.Account) {
    const isGasToken = BSTokenHelper.predicateByHash(params.validatedInputs.token)(BSNeo3Constants.GAS_TOKEN)

    if (isGasToken) {
      return this.#buildGasCIM(params, neonJsAccount)
    }

    return this.#buildNeoCIM(params, neonJsAccount)
  }

  async #validateGas({
    amount,
    balances,
    token,
    account,
    receiverAddress,
  }: TNeo3NeoXBridgeServiceValidateInputParams<BSName>): Promise<TNeo3NeoXBridgeServiceValidatedInputs> {
    const gasBalance = balances.find(balance => BSTokenHelper.predicateByHash(balance.token)(BSNeo3Constants.GAS_TOKEN))

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
    const minGasBalanceNumber = BSBigNumberHelper.fromNumber(this.BRIDGE_GAS_FEE)

    const validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs = {
      receiveAmount: amount,
      token,
      amount,
    }

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
  }: TNeo3NeoXBridgeServiceCalculateMaxAmountParams<BSName>): Promise<string> {
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

    const validatedInputs: TNeo3NeoXBridgeServiceValidatedInputs = {
      receiveAmount: amountNumber.minus(this.BRIDGE_MIN_AMOUNT).toString(),
      token,
      amount: amountNumber.toString(),
    }

    const fee = await this.calculateFee({
      account,
      receiverAddress,
      validatedInputs,
    })

    const maxAmount = amountNumber.minus(fee).toString()

    return maxAmount
  }

  async calculateFee(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string> {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { account } = params

      const { neonJsAccount } = await this.#service.generateSigningCallback(account)

      const invoker = await NeonInvoker.init({
        rpcAddress: this.#service.network.url,
        account: neonJsAccount,
      })

      const contractInvocationMulti = this.#buildCIM(params, neonJsAccount)

      const { total } = await invoker.calculateFee(contractInvocationMulti)

      return total.toString()
    } catch (error: any) {
      throw new BSError(error.message, 'FEE_CALCULATION_ERROR')
    }
  }

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account } = params

    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(account)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const contractInvocationMulti = this.#buildCIM(params, neonJsAccount)

    const transactionHash = await invoker.invokeFunction(contractInvocationMulti)

    return transactionHash
  }

  async validateInputs(
    params: TNeo3NeoXBridgeServiceValidateInputParams<BSName>
  ): Promise<TNeo3NeoXBridgeServiceValidatedInputs> {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const normalizedSelectedToken = BSTokenHelper.normalizeToken(params.token)

    const isGasToken = normalizedSelectedToken.hash === BSNeo3Constants.GAS_TOKEN.hash
    const isNeoToken = normalizedSelectedToken.hash === BSNeo3Constants.NEO_TOKEN.hash

    if (isGasToken) {
      return this.#validateGas(params)
    } else if (isNeoToken) {
      return this.#validateNeo(params)
    } else {
      throw new BSError('Only GAS and NEO tokens are supported for bridging', 'UNSUPPORTED_TOKEN')
    }
  }

  async wait(params: TNeo3NeoXBridgeServiceWaitParams) {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    try {
      const { transactionHash, validatedInputs } = params

      let nonce: string

      const log = await BSUtilsHelper.retry(() => DoraNeoRest.log(transactionHash, this.#service.network.id), {
        retries: 10,
        delay: 30000,
      })

      if (log.vmstate !== 'HALT') {
        throw new Error()
      }

      const isGasToken = BSTokenHelper.predicateByHash(validatedInputs.token)(BSNeo3Constants.GAS_TOKEN)

      if (isGasToken) {
        const notification = log.notifications.find(item => item.event_name === 'NativeDeposit')
        nonce = notification?.state.value[0].value
      } else {
        const notification = log.notifications.find(item => item.event_name === 'TokenDeposit')
        nonce = notification?.state.value[2].value
      }

      if (!nonce) {
        throw new Error()
      }

      await BSUtilsHelper.retry(
        async () => {
          let url: string
          if (isGasToken) {
            url = `${this.BRIDGE_NEOX_BASE_CONFIRMATION_URL}/${nonce}`
          } else {
            url = `${this.BRIDGE_NEOX_BASE_CONFIRMATION_URL}/${this.BRIDGE_NEOX_NEO_TOKEN_HASH}/${nonce}`
          }

          const response = await axios.get<{ txid: string | null }>(url)

          if (!response.data?.txid) {
            throw new BSError('Transaction not found', 'TRANSACTION_NOT_FOUND')
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
