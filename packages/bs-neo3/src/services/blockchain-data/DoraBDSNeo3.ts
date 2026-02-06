import {
  TBalanceResponse,
  BSCommonConstants,
  TBSToken,
  BSBigNumberHelper,
  TBridgeToken,
  type TTransaction,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TContractResponse,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { RpcBDSNeo3 } from './RpcBDSNeo3'
import { IBSNeo3, type TRpcBDSNeo3Notification } from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { StateResponse } from '@cityofzion/dora-ts/dist/interfaces/api/common'
import { Notification } from '@cityofzion/dora-ts/dist/interfaces/api/neo'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'

export class DoraBDSNeo3<N extends string> extends RpcBDSNeo3<N> {
  static getClient() {
    return new api.NeoRESTApi({ url: BSCommonConstants.COZ_API_URL, endpoint: '/api/v2/neo3' })
  }

  static getBridgeNeo3NeoXDataByNotifications<N extends string>(notifications: Notification[], service: IBSNeo3<N>) {
    const gasNotification = notifications.find(({ event_name }) => event_name === 'NativeDeposit')
    const isNativeToken = !!gasNotification

    const neoNotification = !isNativeToken
      ? notifications.find(({ event_name }) => event_name === 'TokenDeposit')
      : undefined

    const notification = isNativeToken ? gasNotification : neoNotification
    const notificationStateValue = (notification?.state as StateResponse)?.value as StateResponse[]

    if (!notificationStateValue) return undefined

    let tokenToUse: TBridgeToken<N> | undefined
    let amountInDecimals: string | undefined
    let byteStringReceiverAddress: string | undefined

    if (isNativeToken) {
      tokenToUse = service.neo3NeoXBridgeService.gasToken
      amountInDecimals = notificationStateValue[2]?.value as string
      byteStringReceiverAddress = notificationStateValue[1]?.value as string
    } else {
      tokenToUse = service.neo3NeoXBridgeService.neoToken
      amountInDecimals = notificationStateValue[4]?.value as string
      byteStringReceiverAddress = notificationStateValue[3]?.value as string
    }

    if (!tokenToUse || !amountInDecimals || !byteStringReceiverAddress) return undefined

    const { u } = BSNeo3NeonJsSingletonHelper.getInstance()

    return {
      amount: BSBigNumberHelper.toNumber(BSBigNumberHelper.fromDecimals(amountInDecimals, tokenToUse.decimals)),
      tokenToUse,
      receiverAddress: `0x${u.HexString.fromBase64(byteStringReceiverAddress).toLittleEndian()}`,
    }
  }

  #apiInstance?: api.NeoRESTApi

  constructor(service: IBSNeo3<N>) {
    super(service)
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = DoraBDSNeo3.getClient()
    }

    return this.#apiInstance
  }

  async getTransaction(hash: string): Promise<TTransaction<N>> {
    if (BSNeo3Helper.isCustomNetwork(this._service.network)) {
      return await super.getTransaction(hash)
    }

    const response = await this.#api.transaction(hash, this._service.network.id)

    const applicationLog = await this.#api.log(hash, this._service.network.id)
    const notifications = applicationLog.notifications?.map(({ contract, state, event_name }) => ({
      contract,
      state,
      eventname: event_name,
    }))

    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()
    const txIdUrl = txTemplateUrl?.replace('{txId}', response.hash)

    const events = await this._extractEventsFromNotifications(notifications)

    let transaction: TTransaction<N> = {
      block: response.block,
      date: new Date(Number(response.time) * 1000).toISOString(),
      txId: response.hash,
      txIdUrl,
      systemFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(response.sysfee ?? 0, this._service.feeToken.decimals),
        { decimals: this._service.feeToken.decimals }
      ),
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(response.netfee ?? 0, this._service.feeToken.decimals),
        { decimals: this._service.feeToken.decimals }
      ),
      events,
      invocationCount: 0,
      notificationCount: 0,
      type: 'default',
    }

    const bridgeNeo3NeoXData = this.getBridgeNeo3NeoXDataByNotifications(notifications)

    if (bridgeNeo3NeoXData) {
      transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
    }

    return transaction
  }

  async getTransactionsByAddress({
    address,
    nextPageParams = 1,
  }: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>> {
    if (BSNeo3Helper.isCustomNetwork(this._service.network)) {
      return await super.getTransactionsByAddress({ address, nextPageParams })
    }

    const data = await this.#api.addressTXFull(address, nextPageParams, this._service.network.id)

    const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()

    const transactions: TTransaction<N>[] = []

    const promises = data.items.map(async item => {
      const notifications = item.notifications?.map<TRpcBDSNeo3Notification>(({ contract, state, event_name }) => ({
        contract,
        state,
        eventname: event_name,
      }))

      const events = await this._extractEventsFromNotifications(notifications)

      const txIdUrl = txTemplateUrl?.replace('{txId}', item.hash)

      let transaction: TTransaction<N> = {
        block: item.block,
        date: new Date(Number(item.time) * 1000).toISOString(),
        txId: item.hash,
        txIdUrl,
        systemFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(item.sysfee ?? 0, this._service.feeToken.decimals),
          { decimals: this._service.feeToken.decimals }
        ),
        networkFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(item.netfee ?? 0, this._service.feeToken.decimals),
          { decimals: this._service.feeToken.decimals }
        ),
        events,
        invocationCount: 0,
        notificationCount: notifications?.length ?? 0,
        type: 'default',
      }

      const bridgeNeo3NeoXData = this.getBridgeNeo3NeoXDataByNotifications(notifications)
      if (bridgeNeo3NeoXData) {
        transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
      }

      transactions.push(transaction)
    })

    await Promise.allSettled(promises)

    const limit = 15
    const totalPages = Math.ceil(data.totalCount / limit)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      transactions,
    }
  }

  async getContract(contractHash: string): Promise<TContractResponse> {
    if (BSNeo3Helper.isCustomNetwork(this._service.network)) {
      return await super.getContract(contractHash)
    }

    try {
      const data = await this.#api.contract(contractHash, this._service.network.id)
      return {
        hash: data.hash,
        methods: data.manifest.abi?.methods ?? [],
        name: data.manifest.name,
      }
    } catch {
      throw new Error(`Contract not found: ${contractHash}`)
    }
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    if (BSNeo3Helper.isCustomNetwork(this._service.network)) {
      return await super.getTokenInfo(tokenHash)
    }

    try {
      const cachedToken = this._tokenCache.get(tokenHash)
      if (cachedToken) {
        return cachedToken
      }

      let token = this._service.tokens.find(token => this._service.tokenService.predicateByHash(tokenHash, token))

      if (!token) {
        const { decimals, symbol, name, scripthash } = await this.#api.asset(tokenHash, this._service.network.id)
        token = this._service.tokenService.normalizeToken({
          decimals: Number(decimals),
          symbol,
          name,
          hash: scripthash,
        })
      }

      this._tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`TBSToken not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    if (BSNeo3Helper.isCustomNetwork(this._service.network)) {
      return await super.getBalance(address)
    }

    const response = await this.#api.balance(address, this._service.network.id)

    const promises = response.map<Promise<TBalanceResponse | undefined>>(async balance => {
      try {
        const token = await this.getTokenInfo(balance.asset)
        return {
          amount: balance.balance.toString(),
          token,
        }
      } catch {
        // Empty block
      }
    })
    const balances = await Promise.all(promises)

    return balances.filter(balance => balance !== undefined) as TBalanceResponse[]
  }
}
