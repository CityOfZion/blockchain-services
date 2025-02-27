import {
  BalanceResponse,
  ContractMethod,
  ContractResponse,
  Network,
  Token,
  TransactionResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  BSCommonConstants,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  NftDataService,
  ExplorerService,
} from '@cityofzion/blockchain-service'
import axios from 'axios'
import { ethers } from 'ethers'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import { api } from '@cityofzion/dora-ts'
import { DoraBDSEthereum } from './DoraBDSEthereum'

type MoralisNativeBalanceResponse = {
  balance: string
}

type MoralisERC20BalanceResponse = {
  token_address: string
  name: string
  symbol: string
  decimals: number
  balance: string
  possible_spam: boolean
}

type MoralisERC20MetadataResponse = {
  name: string
  symbol: string
  decimals: string
}

interface MoralisTransactionResponse {
  from_address: string
  to_address: string
  value: string
  transaction_fee: string
  block_timestamp: string
  block_number: string
  logs: {
    address: string
    decoded_event: {
      label: string
      params: {
        name: string
        value: string
        type: string
      }[]
    }
  }[]
}

interface MoralisWalletHistoryResponse {
  cursor?: string
  result: {
    hash: string
    transaction_fee: string
    block_timestamp: string
    block_number: string
    nft_transfers: {
      token_address: string
      token_id: string
      from_address: string
      to_address: string
      possible_spam: boolean
    }[]
    erc20_transfers: {
      token_name: string
      token_symbol: string
      token_decimals: string
      address: string
      to_address: string
      from_address: string
      value: string
      possible_spam: boolean
      verified_contract: boolean
    }[]
    native_transfers: {
      from_address: string
      to_address: string
      value: string
    }[]
  }[]
}

interface MoralisTokenMetadataResponse {
  name: string
}

export class MoralisBDSEthereum extends DoraBDSEthereum {
  static BASE_URL = `${BSCommonConstants.DORA_URL}/api/v2/meta`

  static SUPPORTED_CHAINS = [
    BSEthereumConstants.ETHEREUM_MAINNET_NETWORK_ID,
    '11155111',
    '17000',
    BSEthereumConstants.POLYGON_MAINNET_NETWORK_ID,
    '80002',
    '56',
    '97',
    BSEthereumConstants.ARBITRUM_MAINNET_NETWORK_ID,
    '421614',
    BSEthereumConstants.BASE_MAINNET_NETWORK_ID,
    '84532',
    '10',
    '11155420',
    '59144',
    '59141',
    '43114',
    '250',
    '4002',
    '25',
    '11297108109',
    '2020',
    '100',
    '10200',
    '88888',
    '88882',
    '369',
    '1284',
    '1285',
    '1287',
    '81457',
    '168587773',
    '324',
    '300',
    '5000',
    '5003',
    '1101',
    '2442',
    '7000',
    '7001',
  ]

  static getClient(network: Network<BSEthereumNetworkId>) {
    return axios.create({
      baseURL: MoralisBDSEthereum.BASE_URL,
      params: {
        chain: `0x${Number(network.id).toString(16)}`,
      },
    })
  }

  static isSupported(network: Network<BSEthereumNetworkId>) {
    return MoralisBDSEthereum.SUPPORTED_CHAINS.includes(network.id)
  }

  constructor(network: Network<BSEthereumNetworkId>, nftDataService: NftDataService, explorerService: ExplorerService) {
    super(
      network,
      [
        BSEthereumConstants.ETHEREUM_MAINNET_NETWORK_ID,
        BSEthereumConstants.POLYGON_MAINNET_NETWORK_ID,
        BSEthereumConstants.BASE_MAINNET_NETWORK_ID,
        BSEthereumConstants.ARBITRUM_MAINNET_NETWORK_ID,
      ],
      nftDataService,
      explorerService
    )
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    if (!MoralisBDSEthereum.isSupported(this._network)) {
      return super.getBalance(address)
    }

    const client = MoralisBDSEthereum.getClient(this._network)

    const {
      data: { balance: nativeBalance },
    } = await client.get<MoralisNativeBalanceResponse>(`${address}/balance`)

    const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

    const balances: BalanceResponse[] = [
      {
        amount: ethers.utils.formatUnits(nativeBalance, nativeToken.decimals),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await client.get<MoralisERC20BalanceResponse[]>(`${address}/erc20`)

    erc20Balances.forEach(balance => {
      if (balance.possible_spam || !balance.decimals || !balance.token_address || !balance.symbol) return

      balances.push({
        amount: ethers.utils.formatUnits(balance.balance, balance.decimals),
        token: {
          decimals: balance.decimals,
          hash: balance.token_address,
          name: balance.name ?? '',
          symbol: balance.symbol,
        },
      })
    })

    return balances
  }

  async getTokenInfo(hash: string): Promise<Token> {
    if (!MoralisBDSEthereum.isSupported(this._network)) {
      return super.getTokenInfo(hash)
    }

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._network)

    if (BSEthereumHelper.normalizeHash(nativeAsset.hash) === BSEthereumHelper.normalizeHash(hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const client = MoralisBDSEthereum.getClient(this._network)
    const response = await client.get<MoralisERC20MetadataResponse[]>(`/erc20/metadata`, {
      params: {
        addresses: [hash],
      },
    })

    const data = response.data[0]

    const token: Token = {
      decimals: Number(data.decimals),
      symbol: data.symbol,
      hash,
      name: data.name,
    }

    this._tokenCache.set(hash, token)

    return token
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    if (!MoralisBDSEthereum.isSupported(this._network)) {
      return super.getTransaction(hash)
    }

    const client = MoralisBDSEthereum.getClient(this._network)

    const { data } = await client.get<MoralisTransactionResponse>(`/transaction/${hash}/verbose`)

    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    if (data.value && Number(data.value) > 0) {
      const nativeToken = BSEthereumHelper.getNativeAsset(this._network)

      transfers.push({
        amount: ethers.utils.formatUnits(data.value, nativeToken.decimals),
        from: data.from_address,
        to: data.to_address,
        type: 'token',
        token: nativeToken,
        contractHash: nativeToken.hash,
      })
    }

    if (data.logs) {
      const promises = data.logs.map(async log => {
        if (!log.decoded_event) return
        if (log.decoded_event.label.toLowerCase() !== 'transfer') return

        const contractHash = log.address
        const amount = log.decoded_event.params.find((param: any) => param.name === 'value')?.value
        const from = log.decoded_event.params.find((param: any) => param.name === 'from')?.value
        const to = log.decoded_event.params.find((param: any) => param.name === 'to')?.value
        if (!from || !to) return

        if (amount) {
          const token = await this.getTokenInfo(contractHash)

          transfers.push({
            contractHash,
            amount: ethers.utils.formatUnits(amount, token.decimals),
            from,
            to,
            type: 'token',
          })
        }

        const tokenId = log.decoded_event.params.find((param: any) => param.name === 'tokenId')?.value
        if (!tokenId) return

        transfers.push({
          contractHash,
          tokenId,
          from,
          to,
          type: 'nft',
        })
      })

      await Promise.allSettled(promises)
    }

    return {
      block: Number(data.block_number),
      hash,
      notifications: [],
      time: new Date(data.block_timestamp).getTime() / 1000,
      transfers,
      fee: data.transaction_fee,
    }
  }

  async getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    if (!MoralisBDSEthereum.isSupported(this._network)) {
      return super.getTransactionsByAddress(params)
    }

    const client = MoralisBDSEthereum.getClient(this._network)

    const { data } = await client.get<MoralisWalletHistoryResponse>(`/wallets/${params.address}/history`, {
      params: {
        limit: 15,
        cursor: params.nextPageParams,
      },
    })

    const transactions: TransactionResponse[] = []

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._network)

    const promises = data.result.map(async item => {
      const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

      item.native_transfers.forEach(transfer => {
        transfers.push({
          amount: ethers.utils.formatUnits(transfer.value, nativeAsset.decimals),
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'token',
          token: nativeAsset,
          contractHash: nativeAsset.hash,
        })
      })

      item.erc20_transfers.forEach(transfer => {
        if (transfer.possible_spam) return

        transfers.push({
          amount: ethers.utils.formatUnits(transfer.value, transfer.token_decimals),
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'token',
          token: {
            decimals: Number(transfer.token_decimals),
            hash: transfer.address,
            name: transfer.token_name,
            symbol: transfer.token_symbol,
          },
          contractHash: transfer.address,
        })
      })

      item.nft_transfers.forEach(transfer => {
        transfers.push({
          contractHash: transfer.token_address,
          tokenId: transfer.token_id,
          from: transfer.from_address,
          to: transfer.to_address,
          type: 'nft',
        })
      })

      transactions.push({
        block: Number(item.block_number),
        hash: item.hash,
        notifications: [],
        time: new Date(item.block_timestamp).getTime() / 1000,
        transfers,
        fee: item.transaction_fee,
      })
    })

    await Promise.allSettled(promises)

    return {
      nextPageParams: data.cursor,
      transactions,
    }
  }

  async getFullTransactionsByAddress(
    params: FullTransactionsByAddressParams
  ): Promise<FullTransactionsByAddressResponse> {
    this.validateFullTransactionsByAddressParams(params)

    const response = await api.EthereumREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._network.id,
      cursor: params.nextCursor,
    })

    return await this.transformFullTransactionsByAddressResponse(response)
  }

  async getContract(hash: string): Promise<ContractResponse> {
    if (!MoralisBDSEthereum.isSupported(this._network)) {
      return super.getContract(hash)
    }

    try {
      const client = MoralisBDSEthereum.getClient(this._network)

      const { data } = await client.get<MoralisTokenMetadataResponse[]>(`erc20/metadata`, {
        params: {
          addresses: [hash],
        },
      })

      const methods: ContractMethod[] = []

      ERC20_ABI.forEach(abi => {
        if (abi.type !== 'function') return

        const parameters = abi.inputs?.map(param => ({
          name: param.name,
          type: param.type,
        }))

        methods.push({
          name: abi.name ?? '',
          parameters: parameters ?? [],
        })
      })

      return {
        hash,
        name: data[0].name,
        methods,
      }
    } catch {
      throw new Error('Contract not found or not an ERC20 token')
    }
  }
}
