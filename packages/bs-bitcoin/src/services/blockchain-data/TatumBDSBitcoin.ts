import {
  BSBigHumanAmount,
  BSBigUnitAmount,
  BSError,
  BSUtilsHelper,
  type IBlockchainDataService,
  type TBalanceResponse,
  type TBSToken,
  type TContractResponse,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TNftResponse,
  type TTransactionUtxoInputOutput,
  type TTransactionUtxo,
} from '@cityofzion/blockchain-service'
import type {
  IBSBitcoin,
  TXverseBalancesResponse,
  TXverseTokenResponse,
  TOrdinalsContentResponse,
  TTatumBalanceResponse,
  TTatumTransactionResponse,
} from '../../types'
import { BSBitcoinConstants } from '../../constants/BSBitcoinConstants'
import { BSBitcoinTatumHelper } from '../../helpers/BSBitcoinTatumHelper'
import { BSBitcoinOrdinalsHelper } from '../../helpers/BSBitcoinOrdinalsHelper'
import { BSBitcoinXverseHelper } from '../../helpers/BSBitcoinXverseHelper'
import { AxiosInstance } from 'axios'

export class TatumBDSBitcoin implements IBlockchainDataService {
  readonly #service: IBSBitcoin
  readonly #cachedTokens = new Map<string, TBSToken>()
  readonly #tatumApi: AxiosInstance
  readonly #xverseApi = BSBitcoinXverseHelper.getApi()
  readonly #ordinalsApi = BSBitcoinOrdinalsHelper.getApi()

  readonly maxTimeToConfirmTransactionInMs = 1000 * 60 * 10 // 10 minutes

  constructor(service: IBSBitcoin) {
    this.#service = service
    this.#tatumApi = BSBitcoinTatumHelper.getApi(this.#service.network)
  }

  #validateMainnet() {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  #isNumberValid(value: number | null) {
    return typeof value === 'number' && value >= 0
  }

  async #transformTatumTransactionToTransaction({
    hex,
    hash,
    ...transaction
  }: TTatumTransactionResponse): Promise<TTransactionUtxo> {
    const token = BSBitcoinConstants.NATIVE_TOKEN
    const tokenDecimals = token.decimals
    const feeDecimals = this.#service.feeToken.decimals
    const lowercaseHex = hex.toLowerCase()
    const nfts: TNftResponse[] = []
    const inputs: TTransactionUtxoInputOutput[] = []

    let totalAmountBn = new BSBigHumanAmount(0, BSBitcoinConstants.NATIVE_TOKEN.decimals)

    const hasNft =
      !!transaction.witnessHash && // SegWit or Taproot
      /6f7264/.test(lowercaseHex) && // Should have "ord"
      // Could be image
      (/696d616765/.test(lowercaseHex) ||
        // Could be application
        /6170706c69636174696f6e/.test(lowercaseHex))

    const inputPromises = transaction.inputs.map(async (input, index) => {
      const { coin } = input
      const value = coin?.value
      const address = coin?.address || undefined
      const addressUrl = address ? this.#service.explorerService.buildAddressUrl(address) : undefined

      const amount = new BSBigUnitAmount(value, tokenDecimals).toHuman().toFormatted()

      if (hasNft) {
        const tokenHash = `${hash}i${index}`
        const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash }))

        if (nft) nfts.splice(index, 0, nft)
      }

      inputs.splice(index, 0, { address, addressUrl, amount, token })
    })

    const outputs = transaction.outputs.map<TTransactionUtxoInputOutput>(output => {
      const address = output.address || undefined
      const addressUrl = address ? this.#service.explorerService.buildAddressUrl(address) : undefined

      const amount = new BSBigUnitAmount(output.value, tokenDecimals).toHuman().toFormatted()

      totalAmountBn = totalAmountBn.plus(amount)

      return { address, addressUrl, amount, token }
    })

    await Promise.allSettled(inputPromises)

    return {
      txId: hash,
      txIdUrl: this.#service.explorerService.buildTransactionUrl(hash),
      hex,
      view: 'utxo',
      block: transaction.blockNumber!,
      date: new Date(transaction.time * 1000).toJSON(),
      networkFeeAmount: new BSBigUnitAmount(transaction.fee, feeDecimals).toHuman().toFormatted(),
      totalAmount: totalAmountBn.toFormatted(),
      nfts,
      inputs,
      outputs,
    }
  }

  async #getTokenFromXverse(symbol: string) {
    let token = this.#cachedTokens.get(symbol)

    if (token) return token

    const { data } = await this.#xverseApi.get<TXverseTokenResponse>(`/v1/brc20/ticker/${symbol}`)
    const symbolUppercase = symbol.toUpperCase()
    const inscriptionId = data.inscriptionId

    token = {
      symbol: symbolUppercase,
      name: symbolUppercase,
      hash: inscriptionId,
      decimals: data.decimals,
    }

    this.#cachedTokens.set(inscriptionId, token)
    this.#cachedTokens.set(symbol, token)

    return token
  }

  async getTransaction(transactionId: string): Promise<TTransactionUtxo> {
    const { data } = await this.#tatumApi.get<TTatumTransactionResponse>('/v4/data/blockchains/transaction', {
      params: { hash: transactionId },
    })

    if (!this.#isNumberValid(data.blockNumber)) {
      throw new BSError('Transaction not confirmed', 'TRANSACTION_NOT_CONFIRMED')
    }

    return await this.#transformTatumTransactionToTransaction(data)
  }

  async getTransactionsByAddress({
    address,
    nextPageParams,
  }: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<TTransactionUtxo>> {
    if (!this.#isNumberValid(nextPageParams)) nextPageParams = 1

    const transactions: TTransactionUtxo[] = []
    const pageSize = 50
    const offset = (nextPageParams - 1) * pageSize

    const { data } = await this.#tatumApi.get<TTatumTransactionResponse[]>(
      '/v4/data/blockchains/transaction/history/utxos',
      {
        params: { pageSize, offset, address },
      }
    )

    const transactionPromises = data
      .filter(transaction => this.#isNumberValid(transaction.blockNumber))
      .map(async (transaction, index) => {
        const newTransaction = await this.#transformTatumTransactionToTransaction(transaction)

        transactions.splice(index, 0, newTransaction)
      })

    await Promise.allSettled(transactionPromises)

    return { transactions, nextPageParams: data.length === pageSize ? ++nextPageParams : undefined }
  }

  async getContract(_contractHash: string): Promise<TContractResponse> {
    throw new BSError('Method not supported', 'METHOD_NOT_SUPPORTED')
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    let token = this.#cachedTokens.get(tokenHash)

    if (token) return token

    if (this.#service.tokenService.predicateByHash(tokenHash, BSBitcoinConstants.NATIVE_TOKEN)) {
      token = BSBitcoinConstants.NATIVE_TOKEN

      this.#cachedTokens.set(tokenHash, token)

      return token
    }

    token = this.#service.tokens.find(token => this.#service.tokenService.predicateByHash(tokenHash, token))

    if (token) {
      this.#cachedTokens.set(tokenHash, token)

      return token
    }

    this.#validateMainnet()

    try {
      const { data } = await this.#ordinalsApi.get<TOrdinalsContentResponse>(`/content/${tokenHash}`)

      token = await this.#getTokenFromXverse(data.tick)

      return token
    } catch {
      throw new BSError(`Token not found: ${tokenHash}`, 'INVALID_TOKEN_HASH')
    }
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const balances: TBalanceResponse[] = []

    const {
      data: { balance },
    } = await this.#tatumApi.get<TTatumBalanceResponse>('/v4/data/blockchains/balance', {
      params: { address },
    })

    balances.push({
      amount: BSBigNumberHelper.fromNumber(balance).isNegative() ? '0' : balance,
      token: BSBitcoinConstants.NATIVE_TOKEN,
    })

    try {
      this.#validateMainnet()
    } catch {
      return balances
    }

    const results: TXverseBalancesResponse['items'] = []
    const limit = 60
    let offset = 0
    let canGetMore = false

    do {
      const [data] = await BSUtilsHelper.tryCatch(async () => {
        const response = await this.#xverseApi.get<TXverseBalancesResponse>(`/v1/ordinals/address/${address}/brc20`, {
          params: { limit, offset },
        })

        return response.data
      })

      if (data) {
        results.push(...data.items)

        offset = offset + limit
        canGetMore = data.total - offset > 0
      } else {
        canGetMore = false
      }
    } while (canGetMore)

    for (const result of results) {
      const [token] = await BSUtilsHelper.tryCatch(() => this.#getTokenFromXverse(result.ticker))

      if (!token) continue

      const amount = new BSBigHumanAmount(result.availableBalance, token.decimals).toFormatted()
      balances.push({ amount, token })
    }

    return balances
  }

  async getBlockHeight(): Promise<number> {
    const { data } = await this.#tatumApi.get<number>('/v4/data/blockchains/block/current')

    return data
  }
}
