import {
  BSBigNumberHelper,
  BSError,
  BSTokenHelper,
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

type TGetBridgeTxByNonceResponse = { result: { Vmstate: string; txid: string } }

export class Neo3NeoXBridgeService<BSName extends string = string> implements INeo3NeoXBridgeService<BSName> {
  readonly BRIDGE_SCRIPT_HASH = '0xbb19cfc864b73159277e1fd39694b3fd5fc613d2'

  readonly #service: BSNeo3<BSName>
  tokens: TBridgeToken[]

  constructor(service: BSNeo3<BSName>) {
    this.#service = service

    this.tokens = [
      { ...BSNeo3Constants.GAS_TOKEN, multichainId: 'gas' },
      { ...BSNeo3Constants.NEO_TOKEN, multichainId: 'neo' },
    ]
  }

  async getApprovalFee(): Promise<string> {
    throw new BSError('Neo3 does not require approval', 'APPROVAl_NOT_NEEDED')
  }

  async getBridgeConstants(token: TBridgeToken): Promise<TNeo3NeoXBridgeServiceConstants> {
    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
    })

    const isNativeToken = BSTokenHelper.predicateByHash(token)(BSNeo3Constants.GAS_TOKEN)

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

    const isNativeToken = BSTokenHelper.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

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

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams): Promise<string | null> {
    const log = await DoraNeoRest.log(params.transactionHash, this.#service.network.id)

    if (log.vmstate !== 'HALT') {
      return null
    }

    const isNativeToken = BSTokenHelper.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

    if (isNativeToken) {
      const notification = log.notifications.find(item => item.event_name === 'NativeDeposit')
      return notification?.state.value[0].value ?? null
    }

    const notification = log.notifications.find(item => item.event_name === 'TokenDeposit')
    return notification?.state.value[2].value ?? null
  }

  async getTransactionHashByNonce(
    params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams
  ): Promise<string | null> {
    const isNativeToken = BSTokenHelper.predicateByHash(params.token)(BSNeo3Constants.GAS_TOKEN)

    const { data } = await axios.post<TGetBridgeTxByNonceResponse>('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      method: 'GetBridgeTxByNonce',
      params: {
        ContractHash: this.BRIDGE_SCRIPT_HASH,
        TokenHash: isNativeToken ? '' : BSNeo3Constants.NEO_TOKEN.hash,
        Nonce: Number(params.nonce),
      },
      id: 1,
    })

    if (!data?.result) {
      throw new BSError('Transaction not found', 'INVALID_RESPONSE')
    }

    return data.result.Vmstate === 'HALT' ? data.result.txid ?? null : null
  }
}
