import {
  BSBigNumberHelper,
  BSError,
  INeo3NeoXBridgeService,
  TBridgeToken,
  TNeo3NeoXBridgeServiceBridgeParam,
  TNeo3NeoXBridgeServiceConstants,
  TNeo3NeoXBridgeServiceGetNonceParams,
  TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams,
} from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { BSNeo3 } from '../../BSNeo3'
import type { ContractInvocation, Signer } from '@cityofzion/neon-dappkit-types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { DoraNeoRest } from '../blockchain-data/DoraBDSNeo3'
import axios from 'axios'
import { LogResponse } from '@cityofzion/dora-ts/dist/interfaces/api/neo'

type TGetBridgeTxByNonceResponse = { result: { Vmstate: string; txid: string } }

export class Neo3NeoXBridgeService<BSName extends string = string> implements INeo3NeoXBridgeService<BSName> {
  readonly BRIDGE_SCRIPT_HASH = '0xbb19cfc864b73159277e1fd39694b3fd5fc613d2'

  readonly #service: BSNeo3<BSName>

  tokens: TBridgeToken<BSName>[]

  constructor(service: BSNeo3<BSName>) {
    this.#service = service

    this.tokens = [
      { ...BSNeo3Constants.GAS_TOKEN, multichainId: 'gas', blockchain: service.name },
      { ...BSNeo3Constants.NEO_TOKEN, multichainId: 'neo', blockchain: service.name },
    ]
  }

  async getApprovalFee(): Promise<string> {
    throw new BSError('Neo3 does not require approval', 'APPROVAl_NOT_NEEDED')
  }

  async getBridgeConstants(token: TBridgeToken<BSName>): Promise<TNeo3NeoXBridgeServiceConstants> {
    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
    })

    const isNativeToken = this.#service.tokenService.predicateByHash(token)(BSNeo3Constants.GAS_TOKEN)

    let invocations: ContractInvocation[]

    if (isNativeToken) {
      invocations = [
        { operation: 'nativeDepositFee', scriptHash: this.BRIDGE_SCRIPT_HASH, args: [] },
        { operation: 'minNativeDeposit', scriptHash: this.BRIDGE_SCRIPT_HASH, args: [] },
        { operation: 'maxNativeDeposit', scriptHash: this.BRIDGE_SCRIPT_HASH, args: [] },
      ]
    } else {
      invocations = [
        {
          operation: 'tokenDepositFee',
          scriptHash: this.BRIDGE_SCRIPT_HASH,
          args: [{ type: 'Hash160', value: token.hash }],
        },
        {
          operation: 'minTokenDeposit',
          scriptHash: this.BRIDGE_SCRIPT_HASH,
          args: [{ type: 'Hash160', value: token.hash }],
        },
        {
          operation: 'maxTokenDeposit',
          scriptHash: this.BRIDGE_SCRIPT_HASH,
          args: [{ type: 'Hash160', value: token.hash }],
        },
      ]
    }

    const response = await invoker.testInvoke({
      invocations,
    })

    const [depositFeeItem, minDepositItem, maxDepositItem] = response.stack

    if (
      !TypeChecker.isStackTypeInteger(depositFeeItem) ||
      !TypeChecker.isStackTypeInteger(minDepositItem) ||
      !TypeChecker.isStackTypeInteger(maxDepositItem)
    )
      throw new BSError('Invalid response', 'INVALID_RESPONSE')

    const bridgeFeeBn = BSBigNumberHelper.fromDecimals(
      depositFeeItem.value,
      BSNeo3Constants.GAS_TOKEN.decimals
    ).toString()
    const minAmountBn = BSBigNumberHelper.fromDecimals(minDepositItem.value, token.decimals).toString()
    const maxAmountBn = BSBigNumberHelper.fromDecimals(maxDepositItem.value, token.decimals).toString()

    const bridgeFee = BSBigNumberHelper.format(bridgeFeeBn, { decimals: BSNeo3Constants.GAS_TOKEN.decimals })
    const bridgeMinAmount = BSBigNumberHelper.format(minAmountBn, { decimals: token.decimals })
    const bridgeMaxAmount = BSBigNumberHelper.format(maxAmountBn, { decimals: token.decimals })

    return {
      bridgeFee,
      bridgeMinAmount,
      bridgeMaxAmount,
    }
  }

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<BSName>): Promise<string> {
    if (!BSNeo3Helper.isMainnet(this.#service.network))
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')

    const { account } = params

    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(account)

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback: signingCallback,
    })

    const contractInvocation: ContractInvocation = {
      scriptHash: this.BRIDGE_SCRIPT_HASH,
      operation: 'depositNative',
      args: [
        { type: 'Hash160', value: neonJsAccount.address },
        { type: 'Hash160', value: params.receiverAddress },
        {
          type: 'Integer',
          value: BSBigNumberHelper.toDecimals(BSBigNumberHelper.fromNumber(params.amount), params.token.decimals),
        },
        {
          type: 'Integer',
          value: BSBigNumberHelper.toDecimals(
            BSBigNumberHelper.fromNumber(params.bridgeFee),
            BSNeo3Constants.GAS_TOKEN.decimals
          ),
        },
      ],
    }

    const signer: Signer = {
      scopes: 16,
      allowedContracts: [this.BRIDGE_SCRIPT_HASH, BSNeo3Constants.GAS_TOKEN.hash],
    }

    const isNativeToken = this.#service.tokenService.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

    if (!isNativeToken) {
      contractInvocation.args?.unshift({ type: 'Hash160', value: BSNeo3Constants.NEO_TOKEN.hash })
      signer.allowedContracts?.push(BSNeo3Constants.NEO_TOKEN.hash)
    }

    const transactionHash = await invoker.invokeFunction({
      invocations: [contractInvocation],
      signers: [signer],
    })

    return transactionHash
  }

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<BSName>): Promise<string> {
    let log: LogResponse | undefined
    try {
      log = await DoraNeoRest.log(params.transactionHash, this.#service.network.id)
    } catch (error) {
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', error)
    }

    if (log?.vmstate !== 'HALT') {
      throw new BSError('Transaction invalid', 'INVALID_TRANSACTION')
    }

    const isNativeToken = this.#service.tokenService.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

    let nonce: string | null = null

    if (isNativeToken) {
      const notification = log.notifications.find(item => item.event_name === 'NativeDeposit')
      nonce = notification?.state.value[0].value ?? null
    } else {
      const notification = log.notifications.find(item => item.event_name === 'TokenDeposit')
      nonce = notification?.state.value[2].value ?? null
    }

    if (!nonce) {
      throw new BSError('Nonce not found in transaction log', 'NONCE_NOT_FOUND')
    }

    return nonce
  }

  async getTransactionHashByNonce(
    params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<BSName>
  ): Promise<string> {
    let data: TGetBridgeTxByNonceResponse | undefined
    try {
      const isNativeToken = this.#service.tokenService.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

      const response = await axios.post<TGetBridgeTxByNonceResponse>('https://neofura.ngd.network', {
        jsonrpc: '2.0',
        method: 'GetBridgeTxByNonce',
        params: {
          ContractHash: this.BRIDGE_SCRIPT_HASH,
          TokenHash: isNativeToken ? '' : BSNeo3Constants.NEO_TOKEN.hash,
          Nonce: Number(params.nonce),
        },
        id: 1,
      })
      data = response.data
    } catch (error) {
      throw new BSError('Failed to get transaction by nonce', 'FAILED_TO_GET_TRANSACTION_BY_NONCE', error)
    }

    if (!data?.result) {
      throw new BSError('Failed to get transaction by nonce', 'FAILED_TO_GET_TRANSACTION_BY_NONCE')
    }

    if (data.result.Vmstate !== 'HALT') {
      throw new BSError('Transaction invalid', 'INVALID_TRANSACTION')
    }

    if (!data.result.txid) {
      throw new BSError('Transaction ID not found in response', 'TXID_NOT_FOUND')
    }

    return data.result.txid
  }
}
