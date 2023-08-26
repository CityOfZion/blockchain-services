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
import { TOKENS } from './constants'

export class DoraBDSNeo3 extends RPCBDSNeo3 {
  readonly network: Network

  constructor(network: Network, feeToken: Token, claimToken: Token) {
    if (network.type === 'custom') {
      throw new Error('DoraBDSNeo3 does not support custom networks')
    }

    super(network, feeToken, claimToken)
    this.network = network
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoRest.transaction(hash, this.network.type)
    return {
      block: data.block,
      time: Number(data.time),
      hash: data.hash,
      fee: Number(
        u.BigInteger.fromNumber(data.netfee ?? 0)
          .add(u.BigInteger.fromNumber(data.sysfee ?? 0))
          .toDecimal(this.feeToken.decimals)
      ),
      notifications: [],
      transfers: [],
    }
  }

  async getTransactionsByAddress(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
    const data = await api.NeoRest.addressTXFull(address, page, this.network.type)
    const transactions = await Promise.all(
      data.items.map(async (item): Promise<TransactionResponse> => {
        const filteredTransfers = item.notifications.filter(
          item => item.event_name === 'Transfer' && (item.state.value.length === 3 || item.state.value.length === 4)
        )
        const transferPromises = filteredTransfers.map<Promise<TransactionTransferAsset | TransactionTransferNft>>(
          async ({ contract: contractHash, state: { value: properties } }) => {
            const isAsset = properties.length === 3

            const from = properties[0].value
            const to = properties[1].value
            const convertedFrom = from ? this.convertByteStringToAddress(from) : 'Mint'
            const convertedTo = to ? this.convertByteStringToAddress(to) : 'Burn'

            if (isAsset) {
              const token = await this.getTokenInfo(contractHash)
              const [, , { value: amount }] = properties
              return {
                amount: Number(u.BigInteger.fromNumber(amount).toDecimal(token.decimals ?? 0)),
                from: from,
                to: convertedTo,
                contractHash,
                type: 'token',
                token,
              }
            }

            return {
              from: convertedFrom,
              to: convertedTo,
              tokenId: this.convertByteStringToInteger(properties[4].value),
              contractHash,
              type: 'nft',
            }
          }
        )
        const transfers = await Promise.all(transferPromises)

        const notifications = item.notifications.map<TransactionNotifications>(notification => ({
          eventName: notification.event_name,
          state: notification.state as any,
        }))

        return {
          block: item.block,
          time: Number(item.time),
          hash: item.hash,
          fee: Number(
            u.BigInteger.fromNumber(item.netfee ?? 0)
              .add(u.BigInteger.fromNumber(item.sysfee ?? 0))
              .toDecimal(this.feeToken.decimals)
          ),
          transfers,
          notifications,
        }
      })
    )

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
    const localToken = TOKENS[this.network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this.tokenCache.has(tokenHash)) {
      return this.tokenCache.get(tokenHash)!
    }

    const { decimals, symbol, name, scripthash } = await api.NeoRest.asset(tokenHash, this.network.type)
    const token = {
      decimals: Number(decimals),
      symbol,
      name,
      hash: scripthash,
    }
    this.tokenCache.set(tokenHash, token)

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const response = await api.NeoRest.balance(address, this.network.type)

    const promises = response.map<Promise<BalanceResponse>>(async balance => {
      const token = await this.getTokenInfo(balance.asset)
      return {
        amount: Number(balance.balance),
        token,
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
