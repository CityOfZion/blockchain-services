import {
  TBalanceResponse,
  BSBigNumberHelper,
  IBlockchainDataService,
  TBSToken,
  type TContractResponse,
  type TTransaction,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionTokenEvent,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyNeonJsSingletonHelper } from '../../helpers/BSNeoLegacyNeonJsSingletonHelper'

export class DoraBDSNeoLegacy<N extends string> implements IBlockchainDataService {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2 // 2 minutes
  readonly #tokenCache: Map<string, TBSToken> = new Map()
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async getTransaction(hash: string): Promise<TTransaction> {
    const data = await api.NeoLegacyREST.transaction(hash, this.#service.network.id)
    if (!data || 'error' in data) throw new Error(`Transaction ${hash} not found`)

    const vout: any[] = data.vout ?? []
    const events: TTransaction['events'] = []

    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const from = vout[vout.length - 1]?.address

    const promises = vout.map(async (transfer, _index) => {
      const token = await this.getTokenInfo(transfer.asset)

      const to = transfer.address
      const contractHash = transfer.asset

      const fromUrl = addressTemplateUrl?.replace('{address}', from)
      const toUrl = addressTemplateUrl?.replace('{address}', to)
      const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

      events.push({
        amount: String(transfer.value),
        from,
        fromUrl,
        to,
        toUrl,
        contractHash,
        contractHashUrl: contractHashUrl,
        eventType: 'token',
        token,
        methodName: 'transfer',
        tokenType: 'nep-5',
      })
    })

    await Promise.allSettled(promises)

    const txIdUrl = txTemplateUrl?.replace('{txId}', data.txid)

    return {
      txId: data.txid,
      txIdUrl,
      block: data.block,
      networkFeeAmount: BSBigNumberHelper.format(data.net_fee ?? 0, {
        decimals: this.#service.feeToken.decimals,
      }),
      systemFeeAmount: BSBigNumberHelper.format(data.sys_fee ?? 0, {
        decimals: this.#service.feeToken.decimals,
      }),
      date: new Date(Number(data.time) * 1000).toISOString(),
      invocationCount: 0,
      notificationCount: 0,
      events,
      type: 'default',
    }
  }

  async getTransactionsByAddress({
    address,
    nextPageParams = 1,
  }: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, nextPageParams, this.#service.network.id)
    const transactions = new Map<string, TTransaction>()

    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const promises = data.entries.map(async entry => {
      if (entry.address_from !== address && entry.address_to !== address) return

      const from = entry.address_from ?? address
      const to = entry.address_to ?? address

      const fromUrl = addressTemplateUrl?.replace('{address}', from)
      const toUrl = addressTemplateUrl?.replace('{address}', to)
      const contractHashUrl = contractTemplateUrl?.replace('{hash}', entry.asset)

      const token = await this.getTokenInfo(entry.asset)

      const event: TTransactionTokenEvent = {
        amount: String(entry.amount),
        from,
        fromUrl,
        to,
        toUrl,
        eventType: 'token',
        contractHash: entry.asset,
        contractHashUrl,
        token,
        methodName: 'transfer',
        tokenType: 'nep-5',
      }

      const existingTransaction = transactions.get(entry.txid)
      if (existingTransaction) {
        existingTransaction.events.push(event)
        return
      }

      transactions.set(entry.txid, {
        block: entry.block_height,
        txId: entry.txid,
        date: new Date(entry.time).toISOString(),
        events: [event],
        invocationCount: 0,
        notificationCount: 0,
        networkFeeAmount: BSBigNumberHelper.format(0, {
          decimals: this.#service.feeToken.decimals,
        }),
        systemFeeAmount: BSBigNumberHelper.format(0, { decimals: this.#service.feeToken.decimals }),
        txIdUrl: txTemplateUrl?.replace('{txId}', entry.txid),
        type: 'default',
      })
    })

    await Promise.allSettled(promises)

    const totalPages = Math.ceil(data.total_entries / data.page_size)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      data: Array.from(transactions.values()),
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
        amount: BSBigNumberHelper.format(balance.balance, { decimals: token.decimals }),
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
