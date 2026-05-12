import {
  BSBigHumanAmount,
  BSBigUnitAmount,
  BSError,
  INeo3NeoXBridgeService,
  TBridgeToken,
  TNeo3NeoXBridgeServiceBridgeParam,
  TNeo3NeoXBridgeServiceConstants,
  TNeo3NeoXBridgeServiceGetNonceParams,
  TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams,
  type TNeo3NeoXBridgeTransactionData,
  type TTransactionBase,
} from '@cityofzion/blockchain-service'
import type { StateResponse, TypedResponse } from '@cityofzion/dora-ts/dist/interfaces/api/common'
import { LogResponse, type Notification } from '@cityofzion/dora-ts/dist/interfaces/api/neo'
import axios from 'axios'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import {
  BSNeo3NeonDappKitSingletonHelper,
  ContractInvocation,
  Signer,
} from '../../helpers/BSNeo3NeonDappKitSingletonHelper'
import type { IBSNeo3, TBSNeo3Name, TNeo3NeoXBridgeServiceGetBridgeTxByNonceApiResponse } from '../../types'
import { DoraBDSNeo3 } from '../blockchain-data/DoraBDSNeo3'

export class Neo3NeoXBridgeService implements INeo3NeoXBridgeService<TBSNeo3Name> {
  static readonly BRIDGE_SCRIPT_HASH: string = '0xbb19cfc864b73159277e1fd39694b3fd5fc613d2'

  readonly #service: IBSNeo3

  readonly gasToken: TBridgeToken<TBSNeo3Name>
  readonly neoToken: TBridgeToken<TBSNeo3Name>
  readonly ndmemeToken: TBridgeToken<TBSNeo3Name>
  readonly tokens: TBridgeToken<TBSNeo3Name>[]

  constructor(service: IBSNeo3) {
    this.#service = service

    this.gasToken = { ...BSNeo3Constants.GAS_TOKEN, blockchain: service.name, multichainId: 'gas' }
    this.neoToken = { ...BSNeo3Constants.NEO_TOKEN, blockchain: service.name, multichainId: 'neo' }
    this.ndmemeToken = {
      ...BSNeo3Constants.NDMEME_TOKEN,
      blockchain: service.name,
      multichainId: 'ndmeme',
    }
    this.tokens = [this.gasToken, this.neoToken, this.ndmemeToken]
  }

  async getApprovalFee(): Promise<string> {
    throw new BSError('Neo3 does not require approval', 'APPROVAl_NOT_NEEDED')
  }

  async getBridgeConstants(token: TBridgeToken<TBSNeo3Name>): Promise<TNeo3NeoXBridgeServiceConstants> {
    const { TypeChecker, NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
    })

    const isNativeToken = this.#service.tokenService.predicateByHash(token, BSNeo3Constants.GAS_TOKEN)

    let invocations: ContractInvocation[]

    if (isNativeToken) {
      invocations = [
        { operation: 'nativeDepositFee', scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, args: [] },
        { operation: 'minNativeDeposit', scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, args: [] },
        { operation: 'maxNativeDeposit', scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, args: [] },
      ]
    } else {
      invocations = [
        {
          operation: 'tokenDepositFee',
          scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH,
          args: [{ type: 'Hash160', value: token.hash }],
        },
        {
          operation: 'minTokenDeposit',
          scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH,
          args: [{ type: 'Hash160', value: token.hash }],
        },
        {
          operation: 'maxTokenDeposit',
          scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH,
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

    const bridgeFee = new BSBigUnitAmount(depositFeeItem.value, BSNeo3Constants.GAS_TOKEN.decimals)
      .toHuman()
      .toFormatted()
    const bridgeMinAmount = new BSBigUnitAmount(minDepositItem.value, token.decimals).toHuman().toFormatted()
    const bridgeMaxAmount = new BSBigUnitAmount(maxDepositItem.value, token.decimals).toHuman().toFormatted()

    return {
      bridgeFee,
      bridgeMinAmount,
      bridgeMaxAmount,
    }
  }

  async bridge(params: TNeo3NeoXBridgeServiceBridgeParam<TBSNeo3Name>): Promise<string> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Bridging to NeoX is only supported on mainnet', 'UNSUPPORTED_NETWORK')
    }

    const { account } = params

    const { neonJsAccount, signingCallback } = await this.#service._generateSigningCallback(account)

    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this.#service.network.url,
      account: neonJsAccount,
      signingCallback,
    })

    const contractInvocation: ContractInvocation = {
      scriptHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH,
      operation: 'depositNative',
      args: [
        { type: 'Hash160', value: neonJsAccount.address },
        { type: 'Hash160', value: params.receiverAddress },
        {
          type: 'Integer',
          value: new BSBigHumanAmount(params.amount, params.token.decimals).toUnit().toFixed(),
        },
        {
          type: 'Integer',
          value: new BSBigHumanAmount(params.bridgeFee, BSNeo3Constants.GAS_TOKEN.decimals).toUnit().toFixed(),
        },
      ],
    }

    const signer: Signer = {
      scopes: 16,
      allowedContracts: [Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH, BSNeo3Constants.GAS_TOKEN.hash],
    }

    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeo3Constants.GAS_TOKEN)

    if (!isNativeToken) {
      contractInvocation.operation = 'depositToken'
      contractInvocation.args!.unshift({ type: 'Hash160', value: params.token.hash })
      signer.allowedContracts!.push(params.token.hash)
    }

    return await invoker.invokeFunction({
      invocations: [contractInvocation],
      signers: [signer],
    })
  }

  async getNonce(params: TNeo3NeoXBridgeServiceGetNonceParams<TBSNeo3Name>): Promise<string> {
    let log: LogResponse | undefined
    try {
      const api = DoraBDSNeo3.getClient()
      log = await api.log(params.transactionHash, this.#service.network.id)
    } catch (error) {
      throw new BSError('Failed to get nonce from transaction log', 'FAILED_TO_GET_NONCE', error)
    }

    if (log?.vmstate !== 'HALT') {
      throw new BSError('Transaction invalid', 'INVALID_TRANSACTION')
    }

    const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeo3Constants.GAS_TOKEN)

    let nonce: string | null

    const notifications = log?.notifications as unknown as Notification[]

    if (isNativeToken) {
      const notification = notifications.find(item => item.event_name === 'NativeDeposit')
      const values = notification?.state as StateResponse
      const value = values?.value as TypedResponse[]
      nonce = value?.[0].value ?? null
    } else {
      const notification = notifications.find(item => item.event_name === 'TokenDeposit')
      const values = notification?.state as StateResponse
      const value = values?.value as TypedResponse[]
      nonce = value?.[2].value ?? null
    }

    if (!nonce) {
      throw new BSError('Nonce not found in transaction log', 'NONCE_NOT_FOUND')
    }

    return nonce
  }

  async getTransactionHashByNonce(
    params: TNeo3NeoXBridgeServiceGetTransactionHashByNonceParams<TBSNeo3Name>
  ): Promise<string> {
    let data: TNeo3NeoXBridgeServiceGetBridgeTxByNonceApiResponse | undefined
    try {
      const isNativeToken = this.#service.tokenService.predicateByHash(params.token, BSNeo3Constants.GAS_TOKEN)

      const response = await axios.post<TNeo3NeoXBridgeServiceGetBridgeTxByNonceApiResponse>(
        'https://neofura.ngd.network',
        {
          jsonrpc: '2.0',
          method: 'GetBridgeTxByNonce',
          params: {
            ContractHash: Neo3NeoXBridgeService.BRIDGE_SCRIPT_HASH,
            TokenHash: isNativeToken ? '' : BSNeo3Constants.NEO_TOKEN.hash,
            Nonce: Number(params.nonce),
          },
          id: 1,
        }
      )
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

  getTokenByMultichainId(multichainId: string): TBridgeToken<TBSNeo3Name> | undefined {
    return this.tokens.find(token => token.multichainId === multichainId)
  }

  getTransactionData(transaction: TTransactionBase): TNeo3NeoXBridgeTransactionData<TBSNeo3Name> | undefined {
    return transaction.data?.neo3NeoxBridge ? transaction.data : undefined
  }
}
