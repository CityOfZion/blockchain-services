import {
  BalanceResponse,
  ContractResponse,
  TransactionHistoryResponse,
  TransactionResponse,
  TransactionNotifications,
  Network,
  Token,
  TransactionTransferNft,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { wallet, u } from '@cityofzion/neon-js'
import { api } from '@cityofzion/dora-ts'
import { RPCBDSNeo3 } from './RpcBDSNeo3'

export class DoraBDSNeo3 extends RPCBDSNeo3 {
  readonly network: Network

  constructor(network: Network) {
    if (network.type === 'custom') {
      throw new Error('DoraBDSNeo3 does not support custom networks')
    }

    super(network)
    this.network = network
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoRest.transaction(hash, this.network.type)
    return {
      block: data.block,
      time: data.time,
      hash: data.hash,
      netfee: data.netfee,
      sysfee: data.sysfee,
      totfee: u.BigInteger.fromNumber(data.netfee ?? 0)
        .add(u.BigInteger.fromNumber(data.sysfee ?? 0))
        .toString(),
      notifications: [],
      transfers: [],
    }
  }

  async getHistoryTransactions(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
    const data = await api.NeoRest.addressTXFull(address, page, this.network.type)
    const transactions = data.items.map<TransactionResponse>(item => {
      const transfers = item.notifications
        .map<TransactionTransferAsset | TransactionTransferNft | null>(notification => {
          const { event_name: eventName } = notification
          const state = notification.state as any

          if (eventName !== 'Transfer') return null

          const isAsset = state.length === 3
          const isNFT = state.length === 4
          if (!isAsset && !isNFT) return null

          const [{ value: from }, { value: to }] = state
          const convertedFrom = from ? this.convertByteStringToAddress(from) : 'Mint'
          const convertedTo = to ? this.convertByteStringToAddress(to) : 'Burn'

          if (isAsset) {
            const [, , { value: amount }] = state
            return {
              amount: amount,
              from: convertedFrom,
              to: convertedTo,
              type: 'asset',
            }
          }

          const [, , , { value: tokenId }] = state
          const convertedTokenId = this.convertByteStringToInteger(tokenId)
          return {
            from: convertedFrom,
            to: convertedTo,
            tokenId: convertedTokenId,
            type: 'nft',
          }
        })
        .filter((transfer): transfer is TransactionTransferAsset | TransactionTransferNft => transfer !== null)

      const notifications = item.notifications.map<TransactionNotifications>(notification => ({
        eventName: notification.event_name,
        state: notification.state as any,
      }))

      return {
        block: item.block,
        time: item.time,
        hash: item.hash,
        netfee: item.netfee,
        sysfee: item.sysfee,
        totfee: (Number(item.sysfee) + Number(item.netfee)).toString(),
        transfers,
        notifications,
      }
    })

    return {
      totalCount: data.totalCount,
      transactions,
    }
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    const data = await api.NeoRest.contract(contractHash, this.network.type)
    return {
      hash: data.hash,
      methods: data.manifest.abi?.methods ?? [],
      name: data.manifest.name,
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const { decimals, symbol, name, scripthash } = await api.NeoRest.asset(tokenHash, this.network.type)

    return {
      decimals: Number(decimals),
      symbol,
      name,
      hash: scripthash,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const data = await api.NeoRest.balance(address, this.network.type)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      const tokenInfo = await api.NeoRest.asset(data[0].asset, this.network.type)
      return {
        amount: Number(balance.balance),
        hash: balance.asset,
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals: Number(tokenInfo.decimals),
      }
    })
    const balances = await Promise.all(promises)
    return balances
  }

  private convertByteStringToAddress(byteString: string): string {
    const account = new wallet.Account(u.reverseHex(u.HexString.fromBase64(byteString).toString()))

    return account.address
  }

  private convertByteStringToInteger(byteString: string): string {
    const integer = u.BigInteger.fromHex(u.reverseHex(u.HexString.fromBase64(byteString).toString())).toString()

    return integer
  }
}
