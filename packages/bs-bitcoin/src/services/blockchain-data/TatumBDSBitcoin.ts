import {
  BSBigNumberHelper,
  BSError,
  BSUtilsHelper,
  type IBlockchainDataService,
  type TBalanceResponse,
  type TBSToken,
  type TContractResponse,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
  type TTransactionNftEvent,
  type TTransactionTokenEvent,
} from '@cityofzion/blockchain-service'
import type {
  IBSBitcoin,
  TXverseBalancesResponse,
  TXverseTokenResponse,
  TOrdinalsContentResponse,
  TTatumApis,
  TTatumBalanceResponse,
  TTatumBlockchainInfoResponse,
  TTatumTransactionResponse,
} from '../../types'
import { BSBitcoinConstants } from '../../constants/BSBitcoinConstants'
import { BSBitcoinTatumHelper } from '../../helpers/BSBitcoinTatumHelper'
import { BSBitcoinOrdinalsHelper } from '../../helpers/BSBitcoinOrdinalsHelper'
import { BSBitcoinXverseHelper } from '../../helpers/BSBitcoinXverseHelper'

export class TatumBDSBitcoin<N extends string> implements IBlockchainDataService<N> {
  readonly #service: IBSBitcoin<N>
  readonly #cachedTokens = new Map<string, TBSToken>()
  readonly #tatumApis: TTatumApis
  readonly #xverseApi = BSBitcoinXverseHelper.getApi()
  readonly #ordinalsApi = BSBitcoinOrdinalsHelper.getApi()

  readonly maxTimeToConfirmTransactionInMs = 1000 * 60 * 10 // 10 minutes

  constructor(service: IBSBitcoin<N>) {
    this.#service = service
    this.#tatumApis = BSBitcoinTatumHelper.getApis(this.#service.network)
  }

  #validateMainnet() {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }
  }

  #isNumberValid(value: number | null) {
    return typeof value === 'number' && value >= 0
  }

  // TODO: implement UTXO transaction type
  async #transformTatumTransactionToTransaction({
    hex,
    hash,
    inputs,
    ...transaction
  }: TTatumTransactionResponse): Promise<TTransaction<N>> {
    const feeDecimals = this.#service.feeToken.decimals
    const lowercaseHex = hex.toLowerCase()
    const from = undefined
    const fromUrl = undefined
    const events: (TTransactionTokenEvent | TTransactionNftEvent)[] = []

    const isNft =
      !!transaction.witnessHash && // SegWit or Taproot
      /6f7264/.test(lowercaseHex) && // Should have "ord"
      // Could be image
      (/696d616765/.test(lowercaseHex) ||
        // Could be text
        /746578742f/.test(lowercaseHex) ||
        // Could be application
        /6170706c69636174696f6e/.test(lowercaseHex))

    const eventPromises = transaction.outputs.map(async (output, index) => {
      let event: TTransactionTokenEvent | TTransactionNftEvent | undefined

      const tokenType = 'native'
      const to = output.address
      const toUrl = this.#service.explorerService.buildAddressUrl(to)
      const hasInputAddress = !!inputs?.[index]?.coin?.address
      const token = BSBitcoinConstants.NATIVE_TOKEN

      const amount = BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(output.value, token.decimals), {
        decimals: token.decimals,
      })

      if (isNft && hasInputAddress) {
        const tokenHash = `${hash}i${index}`
        const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash }))

        event = {
          eventType: 'nft',
          tokenType,
          from,
          fromUrl,
          to,
          toUrl,
          amount,
          token,
          tokenHash,
          name: nft?.name,
          nftUrl: nft?.explorerUri,
          nftImageUrl: nft?.image,
          collectionName: nft?.collection?.name,
          collectionHash: nft?.collection?.hash,
          collectionHashUrl: nft?.collection?.url,
        }
      } else if (!!to || !!from || amount !== '0') {
        event = {
          eventType: 'token',
          tokenType,
          from,
          fromUrl,
          to,
          toUrl,
          amount,
          token,
          contractHash: token.hash,
        }
      }

      if (event) events.splice(index, 0, event)
    })

    await Promise.allSettled(eventPromises)

    return {
      txId: hash,
      txIdUrl: this.#service.explorerService.buildTransactionUrl(hash),
      type: 'default',
      block: transaction.blockNumber!,
      invocationCount: 0,
      notificationCount: 0,
      date: new Date(transaction.time * 1000).toJSON(),
      networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(transaction.fee, feeDecimals), {
        decimals: feeDecimals,
      }),
      systemFeeAmount: '0',
      events,
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

  async getTransaction(txId: string): Promise<TTransaction<N>> {
    const { data } = await this.#tatumApis.v3.get<TTatumTransactionResponse>(`/bitcoin/transaction/${txId}`)

    if (!this.#isNumberValid(data.blockNumber)) {
      throw new BSError('Transaction not confirmed', 'TRANSACTION_NOT_CONFIRMED')
    }

    return await this.#transformTatumTransactionToTransaction(data)
  }

  async getTransactionsByAddress({
    address,
    nextPageParams,
  }: TGetTransactionsByAddressParams): Promise<TGetTransactionsByAddressResponse<N>> {
    if (!this.#isNumberValid(nextPageParams)) nextPageParams = 1

    const transactions: TTransaction<N>[] = []
    const pageSize = 50
    const offset = (nextPageParams - 1) * pageSize

    const { data } = await this.#tatumApis.v3.get<TTatumTransactionResponse[]>(
      `/bitcoin/transaction/address/${address}`,
      {
        params: { pageSize, offset },
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
    const { data } = await this.#tatumApis.v3.get<TTatumBalanceResponse>(`/bitcoin/address/balance/${address}`)

    balances.push({
      amount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromNumber(data.incoming)
          .minus(data.incomingPending)
          .minus(data.outgoing)
          .minus(data.outgoingPending),
        { decimals: BSBitcoinConstants.NATIVE_TOKEN.decimals }
      ),
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

      balances.push({
        amount: BSBigNumberHelper.format(result.availableBalance, { decimals: token.decimals }),
        token,
      })
    }

    return balances
  }

  async getBlockHeight(): Promise<number> {
    const response = await this.#tatumApis.v3.get<TTatumBlockchainInfoResponse>('/bitcoin/info')

    return response.data.blocks
  }
}
