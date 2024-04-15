import {
  BalanceResponse,
  ContractResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionResponse,
  TransactionNotifications,
  Network,
  Token,
  TransactionTransferNft,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { wallet, u } from '@cityofzion/neon-js'
import { NeoRESTApi } from '@cityofzion/dora-ts/dist/api'
import { RPCBDSNeo3 } from './RpcBDSNeo3'
import { TOKENS } from './constants'

const NeoRest = new NeoRESTApi({
  doraUrl: 'https://dora.coz.io',
  endpoint: '/api/v2/neo3',
})

export class DoraBDSNeo3 extends RPCBDSNeo3 {
  constructor(network: Network, feeToken: Token, claimToken: Token) {
    if (network.type === 'custom') {
      throw new Error('DoraBDSNeo3 does not support custom networks')
    }

    super(network, feeToken, claimToken)
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    try {
      const data = await NeoRest.transaction(hash, this._network.type)
      return {
        block: data.block,
        time: Number(data.time),
        hash: data.hash,
        fee: u.BigInteger.fromNumber(data.netfee ?? 0)
          .add(u.BigInteger.fromNumber(data.sysfee ?? 0))
          .toDecimal(this._feeToken.decimals),
        notifications: [],
        transfers: [],
      }
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress({
    address,
    page = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const data = await NeoRest.addressTXFull(address, page, this._network.type)

    const promises = data.items.map(async (item): Promise<TransactionResponse> => {
      const transferPromises: Promise<TransactionTransferAsset | TransactionTransferNft>[] = []

      item.notifications.forEach(({ contract: contractHash, state, event_name: eventName }) => {
        const properties = Array.isArray(state) ? state : state.value
        if (eventName !== 'Transfer' || (properties.length !== 3 && properties.length !== 4)) return

        const promise = async (): Promise<TransactionTransferAsset | TransactionTransferNft> => {
          const isAsset = properties.length === 3

          const from = properties[0].value
          const to = properties[1].value
          const convertedFrom = from ? this.convertByteStringToAddress(from) : 'Mint'
          const convertedTo = to ? this.convertByteStringToAddress(to) : 'Burn'

          if (isAsset) {
            const token = await this.getTokenInfo(contractHash)
            const [, , { value: amount }] = properties
            return {
              amount: u.BigInteger.fromNumber(amount).toDecimal(token.decimals ?? 0),
              from: convertedFrom,
              to: convertedTo,
              contractHash,
              type: 'token',
              token,
            }
          }

          return {
            from: convertedFrom,
            to: convertedTo,
            tokenId: properties[3].value,
            contractHash,
            type: 'nft',
          }
        }

        transferPromises.push(promise())
      })

      const transfers = await Promise.all(transferPromises)

      const notifications = item.notifications.map<TransactionNotifications>(notification => ({
        eventName: notification.event_name,
        state: notification.state as any,
      }))

      return {
        block: item.block,
        time: Number(item.time),
        hash: item.hash,
        fee: u.BigInteger.fromNumber(item.netfee ?? 0)
          .add(u.BigInteger.fromNumber(item.sysfee ?? 0))
          .toDecimal(this._feeToken.decimals),
        transfers,
        notifications,
      }
    })

    const transactions = await Promise.all(promises)

    return {
      totalCount: data.totalCount,
      transactions,
      limit: 15,
    }
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    try {
      const data = await NeoRest.contract(contractHash, this._network.type)
      return {
        hash: data.hash,
        methods: data.manifest.abi?.methods ?? [],
        name: data.manifest.name,
      }
    } catch {
      throw new Error(`Contract not found: ${contractHash}`)
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const localToken = TOKENS[this._network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this._tokenCache.has(tokenHash)) {
      return this._tokenCache.get(tokenHash)!
    }

    try {
      const { decimals, symbol, name, scripthash } = await NeoRest.asset(tokenHash, this._network.type)
      const token = {
        decimals: Number(decimals),
        symbol,
        name,
        hash: scripthash,
      }
      this._tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`Token not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const response = await NeoRest.balance(address, this._network.type)

    const promises = response.map<Promise<BalanceResponse | undefined>>(async balance => {
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
    const filteredBalances = balances.filter(balance => balance !== undefined) as BalanceResponse[]
    return filteredBalances
  }

  private convertByteStringToAddress(byteString: string): string {
    const account = new wallet.Account(u.reverseHex(u.HexString.fromBase64(byteString).toString()))

    return account.address
  }
}
