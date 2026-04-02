import {
  BSUtilsHelper,
  type TBalanceResponse,
  type TContractMethod,
  type TContractParameter,
  type IBlockchainDataService,
  type TBSToken,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TContractResponse,
  type TTransactionDefault,
  type TTransactionDefaultGenericEvent,
  type TTransactionDefaultTokenEvent,
  type TTransactionDefaultNftEvent,
  type TTransactionDefaultEvent,
  BSBigUnitAmount,
} from '@cityofzion/blockchain-service'
import type { IBSNeo3, TRpcBDSNeo3Notification, TRpcBDSNeo3NotificationState } from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'

export class RpcBDSNeo3 implements IBlockchainDataService {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2 // 2 minutes
  readonly _tokenCache: Map<string, TBSToken> = new Map()
  readonly _service: IBSNeo3

  constructor(service: IBSNeo3) {
    this._service = service
  }

  #convertByteStringToAddress(byteString: string): string {
    const { wallet, u } = BSNeo3NeonJsSingletonHelper.getInstance()
    const account = new wallet.Account(u.reverseHex(u.HexString.fromBase64(byteString).toString()))
    return account.address
  }

  async #parseTransferNotification({
    contract: contractHash,
    state,
  }: TRpcBDSNeo3Notification): Promise<TTransactionDefaultTokenEvent | TTransactionDefaultNftEvent | undefined> {
    const properties = (Array.isArray(state) ? state : (state?.value ?? [])) as TRpcBDSNeo3NotificationState[]

    if (properties.length !== 3 && properties.length !== 4) return

    const isAsset = properties.length === 3
    const from = properties[0].value as string
    const to = properties[1].value as string
    const convertedFrom = from ? this.#convertByteStringToAddress(from) : undefined
    const convertedTo = to ? this.#convertByteStringToAddress(to) : undefined
    const fromUrl = convertedFrom ? this._service.explorerService.buildAddressUrl(convertedFrom) : undefined
    const toUrl = convertedTo ? this._service.explorerService.buildAddressUrl(convertedTo) : undefined

    if (isAsset) {
      const token = await this.getTokenInfo(contractHash)
      const amount = properties[2].value || '0'

      return {
        eventType: 'token',
        amount: new BSBigUnitAmount(amount, token.decimals).toHuman().toFormatted(),
        methodName: 'transfer',
        from: convertedFrom,
        fromUrl,
        to: convertedTo,
        toUrl,
        tokenUrl: this._service.explorerService.buildContractUrl(contractHash),
        token,
      }
    }

    const tokenHash = properties[3].value as string

    const [nft] = await BSUtilsHelper.tryCatch(() =>
      this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
    )

    return {
      eventType: 'nft',
      amount: '1',
      methodName: 'transfer',
      from: convertedFrom,
      fromUrl,
      to: convertedTo,
      toUrl,
      nft,
    }
  }

  #parseVoteNotification({ state }: TRpcBDSNeo3Notification): TTransactionDefaultGenericEvent | undefined {
    const properties = (Array.isArray(state) ? state : (state?.value ?? [])) as TRpcBDSNeo3NotificationState[]
    if (properties.length !== 4) return

    const from = properties[0].value as string
    const convertedFrom = this.#convertByteStringToAddress(from)

    const candidatePubKeyBase64 = properties[2].value as string
    const { u } = BSNeo3NeonJsSingletonHelper.getInstance()
    const candidate = u.HexString.fromBase64(candidatePubKeyBase64).toString()

    return this._service.voteService._buildTransactionEvent(convertedFrom, candidate)
  }

  async _extractEventsFromNotifications(notifications: TRpcBDSNeo3Notification[] = []) {
    const events: TTransactionDefaultEvent[] = []

    const promises = notifications.map(async (notification, index) => {
      const eventName = notification.eventname.toLowerCase()
      if (eventName === 'transfer') {
        const transferEvent = await this.#parseTransferNotification(notification)
        if (transferEvent) {
          events.splice(index, 0, transferEvent)
        }
      }

      if (eventName === 'vote') {
        const voteEvent = this.#parseVoteNotification(notification)
        if (voteEvent) {
          events.splice(index, 0, voteEvent)
        }
      }
    })

    await Promise.allSettled(promises)

    return events
  }

  async getTransaction(hash: string): Promise<TTransactionDefault> {
    try {
      const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()
      const rpcClient = new rpc.RPCClient(this._service.network.url)
      const response = await rpcClient.getRawTransaction(hash, true)
      const applicationLog = await rpcClient.getApplicationLog(hash)
      const notifications = applicationLog.executions.flatMap(execution => execution.notifications)

      const events = await this._extractEventsFromNotifications(notifications)

      const txId = response.hash
      const txIdUrl = this._service.explorerService.buildTransactionUrl(txId)

      const data = {
        ...this._service.neo3NeoXBridgeService._getDataFromNotifications(notifications),
        ...this._service.claimService._getTransactionDataFromEvents(events),
        ...this._service.voteService._getTransactionDataFromEvents(events),
      }

      const transaction: TTransactionDefault = {
        txId,
        txIdUrl,
        block: response.validuntilblock,
        date: new Date(Number(response.blocktime) * 1000).toJSON(),
        systemFeeAmount: new BSBigUnitAmount(response.sysfee, this._service.feeToken.decimals).toHuman().toFormatted(),
        networkFeeAmount: new BSBigUnitAmount(response.netfee, this._service.feeToken.decimals).toHuman().toFormatted(),
        invocationCount: 0,
        notificationCount: notifications.length,
        view: 'default',
        events,
        data,
      }

      return transaction
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress(
    _params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<TTransactionDefault>> {
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
    const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()

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
        amount: new BSBigUnitAmount(balance.amount, token.decimals).toHuman().toFormatted(),
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
