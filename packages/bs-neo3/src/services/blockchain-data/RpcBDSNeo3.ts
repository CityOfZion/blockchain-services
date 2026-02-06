import {
  TBalanceResponse,
  TContractMethod,
  TContractParameter,
  IBlockchainDataService,
  TBSToken,
  type TTransaction,
  BSBigNumberHelper,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TContractResponse,
  type TBridgeToken,
  BSUtilsHelper,
} from '@cityofzion/blockchain-service'
import { IBSNeo3, type TRpcBDSNeo3Notification, type TRpcBDSNeo3NotificationState } from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'

export class RpcBDSNeo3<N extends string> implements IBlockchainDataService<N> {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2 // 2 minutes
  readonly _tokenCache: Map<string, TBSToken> = new Map()
  readonly _service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    this._service = service
  }

  #convertByteStringToAddress(byteString: string): string {
    const { wallet, u } = BSNeo3NeonJsSingletonHelper.getInstance()
    const account = new wallet.Account(u.reverseHex(u.HexString.fromBase64(byteString).toString()))
    return account.address
  }

  async _extractEventsFromNotifications(notifications: TRpcBDSNeo3Notification[] = []) {
    const events: TTransaction<N>['events'] = []

    const addressTemplateUrl = this._service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this._service.explorerService.getContractTemplateUrl()
    const nftTemplateUrl = this._service.explorerService.getNftTemplateUrl()

    const promises = notifications.map(async ({ contract: contractHash, state, eventname }) => {
      const properties = (Array.isArray(state) ? state : (state?.value ?? [])) as TRpcBDSNeo3NotificationState[]

      if (eventname !== 'Transfer' || (properties.length !== 3 && properties.length !== 4)) return

      const isAsset = properties.length === 3
      const from = properties[0].value as string
      const to = properties[1].value as string
      const convertedFrom = from ? this.#convertByteStringToAddress(from) : 'Mint'
      const convertedTo = to ? this.#convertByteStringToAddress(to) : 'Burn'

      const fromUrl = addressTemplateUrl?.replace('{address}', convertedFrom)
      const toUrl = addressTemplateUrl?.replace('{address}', convertedTo)
      const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

      if (isAsset) {
        const token = await this.getTokenInfo(contractHash)
        const amount = properties[2].value as string

        events.push({
          amount: BSBigNumberHelper.format(amount ?? 0, { decimals: token.decimals }),
          from: convertedFrom,
          fromUrl,
          to: convertedTo,
          toUrl,
          contractHash,
          contractHashUrl,
          eventType: 'token',
          token,
          tokenType: 'nep-17',
          methodName: 'transfer',
        })

        return
      }

      const tokenHash = properties[3].value as string

      const [nft] = await BSUtilsHelper.tryCatch(() =>
        this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
      )

      const nftUrl = nftTemplateUrl?.replace('{collectionHash}', contractHash).replace('{tokenHash}', tokenHash)

      events.push({
        from: convertedFrom,
        fromUrl,
        to: convertedTo,
        toUrl,
        tokenHash,
        collectionHash: contractHash,
        collectionHashUrl: contractHashUrl,
        eventType: 'nft',
        methodName: 'transfer',
        tokenType: 'nep-11',
        amount: '1',
        nftImageUrl: nft?.image,
        nftUrl,
        name: nft?.name,
        collectionName: nft?.collection?.name,
      })
    })

    await Promise.allSettled(promises)

    return events
  }

  getBridgeNeo3NeoXDataByNotifications(notifications: TRpcBDSNeo3Notification[]) {
    const gasNotification = notifications.find(({ eventname }) => eventname === 'NativeDeposit')
    const isNativeToken = !!gasNotification

    const neoNotification = !isNativeToken
      ? notifications.find(({ eventname }) => eventname === 'TokenDeposit')
      : undefined

    const notification = isNativeToken ? gasNotification : neoNotification
    const notificationStateValue = (notification?.state as TRpcBDSNeo3NotificationState)
      ?.value as TRpcBDSNeo3NotificationState[]

    if (!notificationStateValue) return undefined

    let tokenToUse: TBridgeToken<N> | undefined
    let amountInDecimals: string | undefined
    let byteStringReceiverAddress: string | undefined

    if (isNativeToken) {
      tokenToUse = this._service.neo3NeoXBridgeService.gasToken
      amountInDecimals = notificationStateValue[2]?.value as string
      byteStringReceiverAddress = notificationStateValue[1]?.value as string
    } else {
      tokenToUse = this._service.neo3NeoXBridgeService.neoToken
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

  async getTransaction(hash: string): Promise<TTransaction<N>> {
    try {
      const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()
      const rpcClient = new rpc.RPCClient(this._service.network.url)
      const response = await rpcClient.getRawTransaction(hash, true)

      const txTemplateUrl = this._service.explorerService.getTxTemplateUrl()

      const applicationLog = await rpcClient.getApplicationLog(hash)
      const notifications = applicationLog.executions.flatMap(execution => execution.notifications)

      const events = await this._extractEventsFromNotifications(notifications)

      const txIdUrl = txTemplateUrl?.replace('{txId}', response.hash)

      let transaction: TTransaction<N> = {
        txId: response.hash,
        txIdUrl,
        block: response.validuntilblock,
        systemFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(response.sysfee ?? 0, this._service.feeToken.decimals),
          {
            decimals: this._service.feeToken.decimals,
          }
        ),
        networkFeeAmount: BSBigNumberHelper.format(
          BSBigNumberHelper.fromDecimals(response.netfee ?? 0, this._service.feeToken.decimals),
          {
            decimals: this._service.feeToken.decimals,
          }
        ),
        invocationCount: 0,
        notificationCount: notifications.length,
        events,
        date: new Date(Number(response.blocktime) * 1000).toISOString(),
        type: 'default',
      }

      const bridgeNeo3NeoXData = this.getBridgeNeo3NeoXDataByNotifications(notifications)

      if (bridgeNeo3NeoXData) {
        transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }
      }

      return transaction
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress(
    _params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    throw new Error('Method not supported.')
  }

  async getContract(contractHash: string): Promise<TContractResponse> {
    try {
      const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()

      const rpcClient = new rpc.RPCClient(this._service.network.url)
      const contractState = await rpcClient.getContractState(contractHash)

      const methods = contractState.manifest.abi.methods.map<TContractMethod>(method => ({
        name: method.name,
        parameters: method.parameters.map<TContractParameter>(parameter => ({
          name: parameter.name,
          type: parameter.type,
        })),
      }))

      return {
        hash: contractState.hash,
        name: contractState.manifest.name,
        methods,
      }
    } catch {
      throw new Error(`Contract not found: ${contractHash}`)
    }
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    try {
      const cachedToken = this._tokenCache.get(tokenHash)
      if (cachedToken) {
        return cachedToken
      }

      let token = this._service.tokens.find(token => this._service.tokenService.predicateByHash(tokenHash, token))

      if (!token) {
        const { rpc, u } = BSNeo3NeonJsSingletonHelper.getInstance()

        const rpcClient = new rpc.RPCClient(this._service.network.url)
        const contractState = await rpcClient.getContractState(tokenHash)

        const { TypeChecker, NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

        const invoker = await NeonInvoker.init({
          rpcAddress: this._service.network.url,
        })

        const response = await invoker.testInvoke({
          invocations: [
            {
              scriptHash: tokenHash,
              operation: 'decimals',
              args: [],
            },
            { scriptHash: tokenHash, operation: 'symbol', args: [] },
          ],
        })

        if (!TypeChecker.isStackTypeInteger(response.stack[0])) throw new Error('Invalid decimals')
        if (!TypeChecker.isStackTypeByteString(response.stack[1])) throw new Error('Invalid symbol')
        const decimals = Number(response.stack[0].value)
        const symbol = u.base642utf8(response.stack[1].value)
        token = this._service.tokenService.normalizeToken({
          name: contractState.manifest.name,
          symbol,
          hash: contractState.hash,
          decimals,
        })
      }

      this._tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`Token not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const { rpc, u } = BSNeo3NeonJsSingletonHelper.getInstance()

    const rpcClient = new rpc.RPCClient(this._service.network.url)
    const response = await rpcClient.getNep17Balances(address)

    const promises = response.balance.map<Promise<TBalanceResponse>>(async balance => {
      let token: TBSToken = {
        hash: balance.assethash,
        name: '-',
        symbol: '-',
        decimals: 8,
      }
      try {
        token = await this.getTokenInfo(balance.assethash)
      } catch {
        // Empty Block
      }

      return {
        amount: u.BigInteger.fromNumber(balance.amount).toDecimal(token?.decimals ?? 8),
        token,
      }
    })

    return await Promise.all(promises)
  }

  async getBlockHeight(): Promise<number> {
    const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()
    const rpcClient = new rpc.RPCClient(this._service.network.url)
    return await rpcClient.getBlockCount()
  }
}
