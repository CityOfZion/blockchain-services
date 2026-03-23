import {
  BSBigNumberHelper,
  type TBalanceResponse,
  type IBlockchainDataService,
  type TBSToken,
  type TContractResponse,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionTokenEvent,
  type TTransactionDefault,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import type { IBSNeoLegacy, TBSNeoLegacyName } from '../../types'
import { BSNeoLegacyNeonJsSingletonHelper } from '../../helpers/BSNeoLegacyNeonJsSingletonHelper'

export class DoraBDSNeoLegacy implements IBlockchainDataService<TBSNeoLegacyName> {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2 // 2 minutes
  readonly #tokenCache: Map<string, TBSToken> = new Map()
  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    this.#service = service
  }

  async getTransaction(hash: string): Promise<TTransactionDefault<TBSNeoLegacyName>> {
    const data = await api.NeoLegacyREST.transaction(hash, this.#service.network.id)

    if (!data || 'error' in data) throw new Error(`Transaction ${hash} not found`)

    const vout: any[] = data.vout ?? []
    const events: TTransactionDefault<TBSNeoLegacyName>['events'] = []
    const from = vout[vout.length - 1]?.address

    const promises = vout.map(async (transfer, index) => {
      const token = await this.getTokenInfo(transfer.asset)
      const to = transfer.address
      const fromUrl = this.#service.explorerService.buildAddressUrl(from)
      const toUrl = this.#service.explorerService.buildAddressUrl(to)

      events.splice(index, 0, {
        eventType: 'token',
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(transfer.value), { decimals: token.decimals }),
        methodName: 'transfer',
        from,
        fromUrl,
        to,
        toUrl,
        tokenType: 'nep-5',
        tokenUrl: this.#service.explorerService.buildContractUrl(token.hash),
        token,
      })
    })

    await Promise.allSettled(promises)

    return {
      txId: data.txid,
      txIdUrl: this.#service.explorerService.buildTransactionUrl(data.txid),
      block: data.block,
      date: new Date(Number(data.time) * 1000).toJSON(),
      networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(data.net_fee), {
        decimals: this.#service.feeToken.decimals,
      }),
      systemFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(data.sys_fee), {
        decimals: this.#service.feeToken.decimals,
      }),
      type: 'default',
      view: 'default',
      events,
    }
  }

  async getTransactionsByAddress({
    address,
    nextPageParams = 1,
  }: TGetTransactionsByAddressParams): Promise<
    TGetTransactionsByAddressResponse<TBSNeoLegacyName, TTransactionDefault<TBSNeoLegacyName>>
  > {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, nextPageParams, this.#service.network.id)
    const transactions = new Map<string, TTransactionDefault<TBSNeoLegacyName>>()

    const promises = data.entries.map(async entry => {
      if (entry.address_from !== address && entry.address_to !== address) return

      const from = entry.address_from || address
      const to = entry.address_to || address
      const fromUrl = this.#service.explorerService.buildAddressUrl(from)
      const toUrl = this.#service.explorerService.buildAddressUrl(to)
      const token = await this.getTokenInfo(entry.asset)

      const event: TTransactionTokenEvent = {
        eventType: 'token',
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(entry.amount), { decimals: token.decimals }),
        methodName: 'transfer',
        from,
        fromUrl,
        to,
        toUrl,
        tokenType: 'nep-5',
        tokenUrl: this.#service.explorerService.buildContractUrl(token.hash),
        token,
      }

      const existingTransaction = transactions.get(entry.txid)

      if (existingTransaction) {
        existingTransaction.events.push(event)
        return
      }

      transactions.set(entry.txid, {
        txId: entry.txid,
        txIdUrl: this.#service.explorerService.buildTransactionUrl(entry.txid),
        block: entry.block_height,
        date: new Date(entry.time).toJSON(),
        type: 'default',
        view: 'default',
        events: [event],
      })
    })

    await Promise.allSettled(promises)

    const totalPages = Math.ceil(data.total_entries / data.page_size)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(contractHash: string): Promise<TContractResponse> {
    const response = await api.NeoLegacyREST.contract(contractHash, this.#service.network.id)
    if (!response || 'error' in response) throw new Error(`Contract ${contractHash} not found`)

    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    const cachedToken = this.#tokenCache.get(tokenHash)

    if (cachedToken) {
      return cachedToken
    }

    let token = this.#service.tokens.find(token => this.#service.tokenService.predicateByHash(tokenHash, token))

    if (!token) {
      const data = await api.NeoLegacyREST.asset(tokenHash, this.#service.network.id)
      if (!data || 'error' in data) throw new Error(`Token ${tokenHash} not found`)

      token = {
        decimals: Number(data.decimals),
        symbol: data.symbol,
        hash: data.scripthash,
        name: data.name,
      }
    }

    this.#tokenCache.set(tokenHash, this.#service.tokenService.normalizeToken(token))

    return token
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const data = await api.NeoLegacyREST.balance(address, this.#service.network.id)

    const promises = data.map<Promise<TBalanceResponse>>(async balance => {
      let token: TBSToken = this.#service.tokenService.normalizeToken({
        hash: balance.asset,
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals: 8,
      })

      try {
        token = await this.getTokenInfo(balance.asset)
      } catch {
        // Empty block
      }

      return {
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(balance.balance), { decimals: token.decimals }),
        token,
      }
    })

    return await Promise.all(promises)
  }

  async getBlockHeight(): Promise<number> {
    const { rpc } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    return await rpcClient.getBlockCount()
  }
}
