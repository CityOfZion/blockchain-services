import {
  TBalanceResponse,
  BSBigNumberHelper,
  IBlockchainDataService,
  TBSToken,
  type TContractResponse,
  type TTransactionTokenEvent,
  type TTransactionNftEvent,
  type TTransaction,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  BSUtilsHelper,
  BSError,
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'
import * as solanaKit from '@solana/kit'
import * as solanaToken from '@solana-program/token'
import * as solanaSystem from '@solana-program/system'
import { IBSSolana, type TMetaplexAssetResponse, type TRpcBDSSolanaParsedInstruction } from '../../types'
import axios from 'axios'

export class RpcBDSSolana<N extends string> implements IBlockchainDataService<N> {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 // 1 minutes
  readonly #service: IBSSolana<N>
  #tokenCache: Map<string, TBSToken> = new Map()
  #splAccountCache: Map<string, solanaKit.AccountInfoWithJsonData | null> = new Map()

  constructor(service: IBSSolana<N>) {
    this.#service = service
  }

  async #getSplAccount(address: string) {
    const account = this.#splAccountCache.get(address)
    if (account !== undefined) {
      return account
    }

    let accountInfoValue: solanaKit.AccountInfoWithJsonData | null = null

    try {
      const sourcePubkey = solanaKit.address(address)
      const accountInfo = await this.#service.solanaKitRpc
        .getAccountInfo(sourcePubkey, { encoding: 'jsonParsed' })
        .send()
      accountInfoValue = accountInfo.value
    } catch {
      /* empty */
    }

    this.#splAccountCache.set(address, accountInfoValue)

    return accountInfoValue
  }

  async #parseSplTransferCheckedInstruction(
    instruction: TRpcBDSSolanaParsedInstruction
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent | undefined> {
    const info = instruction.parsed.info as any

    if (
      !info.destination ||
      !info.source ||
      !info.mint ||
      !info.tokenAmount ||
      !info.tokenAmount.amount ||
      !info.tokenAmount.decimals
    )
      return

    const contractHash = info.mint
    const tokenAmount = info.tokenAmount.amount

    let [token] = await BSUtilsHelper.tryCatch(() => this.getTokenInfo(contractHash))
    if (!token) {
      token = {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: BSBigNumberHelper.fromNumber(info.tokenAmount.decimals).toNumber(),
        hash: contractHash,
      }
    }

    const sourceAccountInfo = await this.#getSplAccount(info.source)
    if (!sourceAccountInfo?.data || !('parsed' in sourceAccountInfo.data)) return

    const sourceAccountInfoParsedData = sourceAccountInfo.data.parsed.info as any
    if (!sourceAccountInfoParsedData.mint || !sourceAccountInfoParsedData.owner) return

    const destinationAccountInfo = await this.#getSplAccount(info.destination)
    if (!destinationAccountInfo?.data || !('parsed' in destinationAccountInfo.data)) return

    const destinationAccountInfoParsedData = destinationAccountInfo.data.parsed.info as any
    if (!destinationAccountInfoParsedData.owner) return

    const from = sourceAccountInfoParsedData.owner
    const to = destinationAccountInfoParsedData.owner

    const isNft = token.decimals === 0 && tokenAmount === '1'

    if (isNft) {
      const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash: contractHash }))

      return {
        eventType: 'nft',
        tokenType: 'spl',
        methodName: 'transferChecked',
        from,
        fromUrl: from ? this.#service.explorerService.buildAddressUrl(from) : undefined,
        to,
        toUrl: to ? this.#service.explorerService.buildAddressUrl(to) : undefined,
        tokenHash: contractHash,
        amount: '1',
        name: nft?.name,
        nftImageUrl: nft?.image,
        collectionHash: nft?.collection?.hash,
        collectionHashUrl: nft?.collection?.hash
          ? this.#service.explorerService.buildContractUrl(nft.collection.hash)
          : undefined,
        nftUrl: this.#service.explorerService.buildNftUrl({ tokenHash: contractHash }),
        collectionName: nft?.collection?.name,
      }
    }

    const amountBn = BSBigNumberHelper.fromDecimals(tokenAmount, token.decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals: token.decimals })

    return {
      eventType: 'token',
      amount,
      contractHash,
      contractHashUrl: this.#service.explorerService.buildContractUrl(contractHash),
      from,
      fromUrl: from ? this.#service.explorerService.buildAddressUrl(from) : undefined,
      to,
      toUrl: to ? this.#service.explorerService.buildAddressUrl(to) : undefined,
      token,
      methodName: 'transferChecked',
      tokenType: 'spl',
    }
  }

  async #parseSplTransferInstruction(
    instruction: TRpcBDSSolanaParsedInstruction
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent | undefined> {
    const info = instruction.parsed.info as any

    if (!info || !info.destination || !info.source || !info.amount) return

    const sourceAccountInfo = await this.#getSplAccount(info.source)
    if (!sourceAccountInfo?.data || !('parsed' in sourceAccountInfo.data)) return

    const sourceAccountInfoParsedData = sourceAccountInfo.data.parsed.info as any
    if (!sourceAccountInfoParsedData.mint || !sourceAccountInfoParsedData.owner) return

    const contractHash = sourceAccountInfoParsedData.mint

    let [token] = await BSUtilsHelper.tryCatch(() => this.getTokenInfo(contractHash))
    if (!token) {
      token = {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 6,
        hash: contractHash,
      }
    }

    const destinationAccountInfo = await this.#getSplAccount(info.destination)
    if (!destinationAccountInfo?.data || !('parsed' in destinationAccountInfo.data)) return

    const destinationAccountInfoParsedData = destinationAccountInfo.data.parsed.info as any
    if (!destinationAccountInfoParsedData.owner) return

    const from = sourceAccountInfoParsedData.owner
    const to = destinationAccountInfoParsedData.owner

    const isNft = token.decimals === 0 && info.amount === '1'

    if (isNft) {
      const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash: contractHash }))

      return {
        eventType: 'nft',
        tokenType: 'spl',
        methodName: 'transfer',
        from,
        fromUrl: from ? this.#service.explorerService.buildAddressUrl(from) : undefined,
        to,
        toUrl: to ? this.#service.explorerService.buildAddressUrl(to) : undefined,
        tokenHash: contractHash,
        amount: '1',
        name: nft?.name,
        nftImageUrl: nft?.image,
        collectionHash: nft?.collection?.hash,
        collectionHashUrl: nft?.collection?.hash
          ? this.#service.explorerService.buildContractUrl(nft.collection.hash)
          : undefined,
        nftUrl: this.#service.explorerService.buildNftUrl({ tokenHash: contractHash }),
        collectionName: nft?.collection?.name,
      }
    }

    const amountBn = BSBigNumberHelper.fromDecimals(info.amount, token.decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals: token.decimals })

    return {
      eventType: 'token',
      tokenType: 'spl',
      methodName: 'transfer',
      from,
      fromUrl: from ? this.#service.explorerService.buildAddressUrl(from) : undefined,
      to,
      toUrl: to ? this.#service.explorerService.buildAddressUrl(to) : undefined,
      contractHash,
      contractHashUrl: this.#service.explorerService.buildContractUrl(contractHash),
      amount,
      token,
    }
  }

  async #parseSystemInstruction(
    instruction: TRpcBDSSolanaParsedInstruction
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent | undefined> {
    const info = instruction.parsed.info as any
    const method = instruction.parsed.type

    if (!info || method !== 'transfer' || !info.lamports || !info.source || !info.destination) return

    const amountBn = BSBigNumberHelper.fromDecimals(info.lamports, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals: BSSolanaConstants.NATIVE_TOKEN.decimals })

    const from = info.source
    const to = info.destination
    const contractHash = BSSolanaConstants.NATIVE_TOKEN.hash

    return {
      eventType: 'token',
      amount,
      methodName: 'transfer',
      tokenType: 'native',
      from,
      fromUrl: from ? this.#service.explorerService.buildAddressUrl(from) : undefined,
      to,
      toUrl: to ? this.#service.explorerService.buildAddressUrl(to) : undefined,
      contractHash,
      contractHashUrl: this.#service.explorerService.buildContractUrl(contractHash),
      token: BSSolanaConstants.NATIVE_TOKEN,
    }
  }

  async #parseInstruction(
    instruction: solanaKit.TransactionForFullJsonParsed<'legacy'>['transaction']['message']['instructions'][number]
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent | undefined> {
    if (!('parsed' in instruction) || !instruction.parsed.type || !instruction.parsed.info) return

    const programId = instruction.programId.toString()
    const method = instruction.parsed.type

    if (programId === solanaSystem.SYSTEM_PROGRAM_ADDRESS.toString()) {
      return await this.#parseSystemInstruction(instruction)
    }

    if (programId === solanaToken.TOKEN_PROGRAM_ADDRESS.toString() && method === 'transfer') {
      return await this.#parseSplTransferInstruction(instruction)
    }

    if (programId === solanaToken.TOKEN_PROGRAM_ADDRESS.toString() && method === 'transferChecked') {
      return await this.#parseSplTransferCheckedInstruction(instruction)
    }
  }

  async #parseTransaction(
    transaction?: solanaKit.TransactionForFullJsonParsed<'legacy'> | null,
    blockTime?: bigint | number | null,
    block?: bigint | number | null
  ): Promise<TTransaction<N> | undefined> {
    if (!transaction || !blockTime || !transaction.meta || !block) return

    const events: TTransaction<N>['events'] = []

    const allInstructions = [
      ...transaction.transaction.message.instructions,
      ...(transaction.meta.innerInstructions?.flatMap(item => item.instructions) ?? []),
    ]

    for (const instruction of allInstructions) {
      const event = await this.#parseInstruction(instruction).catch(() => undefined)
      if (event) {
        events.push(event)
      }
    }

    const txId = transaction.transaction.signatures[0]

    return {
      block: BSBigNumberHelper.fromNumber(block).toNumber(),
      txId,
      txIdUrl: this.#service.explorerService.buildTransactionUrl(txId),
      invocationCount: 0,
      notificationCount: 0,
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(transaction.meta.fee, this.#service.feeToken.decimals),
        { decimals: this.#service.feeToken.decimals }
      ),
      date: new Date(BSBigNumberHelper.fromNumber(blockTime).multipliedBy(1000).toNumber()).toJSON(),
      events,
      type: 'default',
    }
  }

  async getTransaction(txid: string): Promise<TTransaction<N>> {
    const signature = solanaKit.signature(txid)
    const transaction = await this.#service.solanaKitRpc
      .getTransaction(signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 })
      .send()

    const parsedTransaction = await this.#parseTransaction(
      transaction as solanaKit.TransactionForFullJsonParsed<'legacy'> | null,
      transaction?.blockTime,
      transaction?.slot
    )

    if (!parsedTransaction) throw new BSError('Transaction not found', 'TRANSACTION_NOT_FOUND')

    return parsedTransaction
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    const solanaKitAddress = solanaKit.address(params.address)

    const signaturesResponse = await this.#service.solanaKitRpc
      .getSignaturesForAddress(solanaKitAddress, {
        limit: 15,
        before: params.nextPageParams,
      })
      .send()

    const response = await axios.post(
      this.#service.network.url,
      signaturesResponse.map((signature, index) => ({
        jsonrpc: '2.0',
        id: index + 1,
        method: 'getTransaction',
        params: [signature.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
      }))
    )

    const transactions: TTransaction<N>[] = []

    const promises = response.data.map(async (response: any) => {
      const parsedTransaction = await this.#parseTransaction(
        response.result,
        response.result?.blockTime,
        response.result?.slot
      )
      if (!parsedTransaction) return

      transactions.push(parsedTransaction)
    })

    await Promise.allSettled(promises)

    return {
      transactions,
      nextPageParams: signaturesResponse.length === 15 ? signaturesResponse.at(-1)?.signature : undefined,
    }
  }

  async getContract(_contractHash: string): Promise<TContractResponse> {
    throw new BSError('Method not supported.', 'METHOD_NOT_SUPPORTED')
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    if (tokenHash === BSSolanaConstants.NATIVE_TOKEN.hash) {
      return BSSolanaConstants.NATIVE_TOKEN
    }

    const cachedToken = this.#tokenCache.get(tokenHash)
    if (cachedToken) {
      return cachedToken
    }

    const url = BSSolanaConstants.PUBLIC_RPC_LIST_BY_NETWORK_ID[this.#service.network.id]

    const response = await axios.post<TMetaplexAssetResponse>(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAsset',
      params: {
        id: tokenHash,
        options: {
          showFungible: true,
          showZeroBalance: true,
        },
      },
    })

    const result = response.data.result

    if (result.interface !== 'FungibleToken') {
      throw new BSError(`Token not found: ${tokenHash}`, 'TOKEN_NOT_FOUND')
    }

    const token: TBSToken = {
      symbol: result.content.metadata.symbol,
      name: result.content.metadata.name,
      decimals: result.token_info.decimals,
      hash: tokenHash,
    }

    this.#tokenCache.set(tokenHash, token)

    return token
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const solanaKitAddress = solanaKit.address(address)
    const nativeBalance = await this.#service.solanaKitRpc.getBalance(solanaKitAddress).send()
    const splBalance = await this.#service.solanaKitRpc
      .getTokenAccountsByOwner(
        solanaKitAddress,
        { programId: solanaToken.TOKEN_PROGRAM_ADDRESS },
        { encoding: 'jsonParsed' }
      )
      .send()

    const nativeBalanceBn = BSBigNumberHelper.fromDecimals(nativeBalance.value, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const nativeBalanceAmount = BSBigNumberHelper.toNumber(nativeBalanceBn)

    const balances: TBalanceResponse[] = [{ amount: nativeBalanceAmount, token: BSSolanaConstants.NATIVE_TOKEN }]

    const promises = splBalance.value.map(async item => {
      const token = await this.getTokenInfo(item.account.data.parsed.info.mint)

      const amountBn = BSBigNumberHelper.fromDecimals(item.account.data.parsed.info.tokenAmount.amount, token.decimals)
      if (amountBn.isNaN() || amountBn.isLessThanOrEqualTo(0)) return

      const amount = BSBigNumberHelper.format(amountBn, { decimals: token.decimals })

      balances.push({
        amount,
        token,
      })
    })

    await Promise.allSettled(promises)

    return balances
  }

  async getBlockHeight(): Promise<number> {
    const blockHeight = await this.#service.solanaKitRpc.getBlockHeight().send()
    return BSBigNumberHelper.fromNumber(blockHeight).toNumber()
  }
}
