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
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'
import solanaSDK, { PublicKey } from '@solana/web3.js'
import * as solanaSplSDK from '@solana/spl-token'
import { IBSSolana, type TMetaplexAssetResponse } from '../../types'
import axios from 'axios'

export class RpcBDSSolana<N extends string> implements IBlockchainDataService<N> {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 // 1 minutes
  readonly #service: IBSSolana<N>
  #tokenCache: Map<string, TBSToken> = new Map()
  #splAccountCache: Map<string, solanaSplSDK.Account | null> = new Map()
  #splAddressCache: Map<string, solanaSDK.PublicKey | null> = new Map()

  constructor(service: IBSSolana<N>) {
    this.#service = service
  }

  async #getSplAddress(
    address: string,
    mint: string,
    instructions: solanaSDK.ParsedInstruction[],
    connection: solanaSDK.Connection
  ) {
    const splAddress = this.#splAddressCache.get(address)
    if (splAddress !== undefined) {
      return splAddress
    }

    let owner: solanaSDK.PublicKey | null = null

    // find owner in instructions, it may found a wrong address,
    // but it is necessary in some cases where the token account is closed and can`t found
    for (const instruction of instructions) {
      const info = instruction.parsed.info

      if (
        instruction.parsed.type.startsWith('initializeAccount') &&
        info.account === address &&
        info.owner &&
        info.mint === mint
      ) {
        owner = new solanaSDK.PublicKey(info.owner)
        break
      }

      if (instruction.parsed.type === 'closeAccount' && info.account === address && info.owner) {
        owner = new solanaSDK.PublicKey(info.owner)
        break
      }
    }

    if (!owner) {
      const account = await this.#getSplAccount(address, connection)
      if (account) {
        owner = account.owner
      }
    }

    this.#splAddressCache.set(address, owner)

    return owner
  }

  async #getSplAccount(address: string, connection: solanaSDK.Connection) {
    const account = this.#splAccountCache.get(address)
    if (account !== undefined) {
      return account
    }

    let tokenAccount: solanaSplSDK.Account | null = null

    try {
      tokenAccount = await solanaSplSDK.getAccount(connection, new solanaSDK.PublicKey(address))
    } catch {
      /* empty */
    }

    this.#splAccountCache.set(address, tokenAccount)

    return tokenAccount
  }

  async #parseSplTransferCheckedInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent> {
    const info = instruction.parsed.info

    if (!info.destination || !info.source || !info.mint) {
      throw new Error('Unsupported instruction format')
    }

    const mintPubkey = new PublicKey(info.mint)
    const contractHash = mintPubkey.toBase58()

    const mintInfo = await this.#service.connection.getParsedAccountInfo(mintPubkey)

    let mintData: any | null = null

    if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
      mintData = mintInfo.value.data.parsed.info
    }

    if (!mintData) {
      throw new Error('Mint info not found')
    }

    const decimals: number = mintData.decimals
    const supply: string = mintData.supply
    const rawAmount: string = info.amount

    const isNft = decimals === 0 && rawAmount === '1' && supply === '1'

    const toTokenAddress = await this.#getSplAddress(
      info.destination,
      contractHash,
      allInstructions,
      this.#service.connection
    )
    if (!toTokenAddress) {
      throw new Error('To account not found')
    }

    const to = toTokenAddress.toBase58()

    const fromTokenAddress = await this.#getSplAddress(
      info.source,
      contractHash,
      allInstructions,
      this.#service.connection
    )
    if (!fromTokenAddress) {
      throw new Error('From account not found')
    }

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()
    const nftTemplateUrl = this.#service.explorerService.getNftTemplateUrl()

    const from = fromTokenAddress.toBase58()

    const fromUrl = addressTemplateUrl?.replace('{address}', from)
    const toUrl = addressTemplateUrl?.replace('{address}', to)

    if (isNft) {
      const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash: contractHash }))

      const nftUrl = nftTemplateUrl?.replace('{tokenHash}', contractHash)
      const collectionHashUrl = nft?.collection?.hash
        ? contractTemplateUrl?.replace('{hash}', nft.collection.hash)
        : undefined

      return {
        eventType: 'nft',
        from,
        fromUrl,
        to,
        toUrl,
        tokenHash: contractHash,
        collectionHash: nft?.collection?.hash,
        collectionHashUrl,
        methodName: 'transferChecked',
        tokenType: 'spl',
        amount: '1',
        collectionName: nft?.collection?.name,
        nftImageUrl: nft?.image,
        name: nft?.name,
        nftUrl,
      }
    }

    const [token] = await BSUtilsHelper.tryCatch(() => this.getTokenInfo(contractHash))

    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals })
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

    return {
      eventType: 'token',
      amount,
      contractHash,
      contractHashUrl,
      from,
      fromUrl,
      to,
      toUrl,
      token,
      methodName: 'transferChecked',
      tokenType: 'spl',
    }
  }

  async #parseSplTransferInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent> {
    const info = instruction.parsed.info

    if (!info.destination || !info.source || !info.amount) {
      throw new Error('Unsupported instruction format')
    }

    const toTokenAccount = await this.#getSplAccount(info.destination, this.#service.connection)
    if (!toTokenAccount) {
      throw new Error('To account not found')
    }

    const mintPubkey = toTokenAccount.mint
    const contractHash = mintPubkey.toBase58()

    const mintInfo = await this.#service.connection.getParsedAccountInfo(mintPubkey)

    let mintData: any | null = null

    if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
      mintData = mintInfo.value.data.parsed.info
    }

    if (!mintData) {
      throw new Error('Mint info not found')
    }

    const decimals: number = mintData.decimals
    const supply: string = mintData.supply
    const rawAmount: string = info.amount

    const isNft = decimals === 0 && rawAmount === '1' && supply === '1'

    let to: string

    if (info.destination === toTokenAccount.address.toBase58()) {
      const toTokenAddress = await this.#getSplAddress(
        info.destination,
        contractHash,
        allInstructions,
        this.#service.connection
      )

      if (!toTokenAddress) {
        throw new Error('To account not found')
      }

      to = toTokenAddress.toBase58()
    } else {
      to = toTokenAccount.address.toBase58()
    }

    const fromTokenAddress = await this.#getSplAddress(
      info.source,
      contractHash,
      allInstructions,
      this.#service.connection
    )
    if (!fromTokenAddress) {
      throw new Error('From account not found')
    }

    const from = fromTokenAddress.toBase58()

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()
    const nftTemplateUrl = this.#service.explorerService.getNftTemplateUrl()

    const fromUrl = addressTemplateUrl?.replace('{address}', from)
    const toUrl = addressTemplateUrl?.replace('{address}', to)

    if (isNft) {
      const [nft] = await BSUtilsHelper.tryCatch(() => this.#service.nftDataService.getNft({ tokenHash: contractHash }))

      const nftUrl = nftTemplateUrl?.replace('{tokenHash}', contractHash)
      const collectionHashUrl = nft?.collection?.hash
        ? contractTemplateUrl?.replace('{hash}', nft.collection.hash)
        : undefined

      return {
        eventType: 'nft',
        tokenType: 'spl',
        methodName: 'transfer',
        from,
        fromUrl,
        to,
        toUrl,
        tokenHash: contractHash,
        amount: '1',
        name: nft?.name,
        nftImageUrl: nft?.image,
        collectionHash: nft?.collection?.hash,
        collectionHashUrl,
        nftUrl,
        collectionName: nft?.collection?.name,
      }
    }

    const [token] = await BSUtilsHelper.tryCatch(() => this.getTokenInfo(contractHash))

    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals })
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

    return {
      eventType: 'token',
      tokenType: 'spl',
      methodName: 'transfer',
      from,
      fromUrl,
      to,
      toUrl,
      contractHash,
      contractHashUrl,
      amount,
      token,
    }
  }

  async #parseSystemInstruction(
    instruction: solanaSDK.ParsedInstruction
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent> {
    const info = instruction.parsed.info
    const method = instruction.parsed.type

    if (info.lamports === undefined || info.source === undefined || method !== 'transfer' || !info.destination) {
      throw new Error('Unsupported instruction format')
    }

    const amountBn = BSBigNumberHelper.fromDecimals(info.lamports, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const amount = BSBigNumberHelper.format(amountBn, { decimals: BSSolanaConstants.NATIVE_TOKEN.decimals })

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const from = info.source
    const to = info.destination
    const contractHash = BSSolanaConstants.NATIVE_TOKEN.hash

    const fromUrl = addressTemplateUrl?.replace('{address}', from)
    const toUrl = addressTemplateUrl?.replace('{address}', to)
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

    return {
      eventType: 'token',
      amount,
      methodName: 'transfer',
      tokenType: 'native',
      from: info.source,
      fromUrl,
      to: info.destination,
      toUrl,
      contractHash,
      contractHashUrl,
      token: BSSolanaConstants.NATIVE_TOKEN,
    }
  }

  async #parseInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent> {
    if (!instruction.parsed.type || !instruction.parsed.info) {
      throw new Error('Unsupported instruction format')
    }

    const programId = instruction.programId.toString()
    const method = instruction.parsed.type

    if (programId === solanaSDK.SystemProgram.programId.toString()) {
      return await this.#parseSystemInstruction(instruction)
    }

    if (programId === solanaSplSDK.TOKEN_PROGRAM_ID.toString() && method === 'transfer') {
      return await this.#parseSplTransferInstruction(instruction, allInstructions)
    }

    if (programId === solanaSplSDK.TOKEN_PROGRAM_ID.toString() && method === 'transferChecked') {
      return await this.#parseSplTransferCheckedInstruction(instruction, allInstructions)
    }

    throw new Error('Unsupported instruction')
  }

  async #parseTransaction(transaction: solanaSDK.ParsedTransactionWithMeta): Promise<TTransaction<N> | undefined> {
    if (!transaction.blockTime || !transaction.meta) return

    const events: TTransaction<N>['events'] = []

    const allInstructions = [
      ...transaction.transaction.message.instructions,
      ...(transaction.meta.innerInstructions?.flatMap(item => item.instructions) ?? []),
    ].filter((item): item is solanaSDK.ParsedInstruction => 'parsed' in item)

    for (const instruction of allInstructions) {
      try {
        const event = await this.#parseInstruction(instruction, allInstructions)
        events.push(event)
      } catch {
        /* empty */
      }
    }

    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()

    const txId = transaction.transaction.signatures[0]
    const txIdUrl = txTemplateUrl?.replace('{txId}', txId)

    return {
      block: transaction.slot,
      txId: transaction.transaction.signatures[0],
      txIdUrl,
      invocationCount: 0,
      notificationCount: 0,
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(transaction.meta.fee, this.#service.feeToken.decimals),
        { decimals: this.#service.feeToken.decimals }
      ),
      date: new Date(transaction.blockTime).toISOString(),
      events,
      type: 'default',
    }
  }

  async getTransaction(txid: string): Promise<TTransaction<N>> {
    const transaction = await this.#service.connection.getParsedTransaction(txid, {
      maxSupportedTransactionVersion: 0,
    })

    if (!transaction) throw new Error('Transaction not found')

    const parsedTransaction = await this.#parseTransaction(transaction)
    if (!parsedTransaction) throw new Error('Transaction not found')

    return parsedTransaction
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    const publicKey = new solanaSDK.PublicKey(params.address)

    const signaturesResponse = await this.#service.connection.getSignaturesForAddress(publicKey, {
      limit: 15,
      before: params.nextPageParams,
    })

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
      const parsedTransaction = await this.#parseTransaction(response.result)
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
    throw new Error('Method not supported.')
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
      throw new Error(`Token not found: ${tokenHash}`)
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
    const publicKey = new solanaSDK.PublicKey(address)

    const nativeBalance = await this.#service.connection.getBalance(publicKey)
    const splBalance = await this.#service.connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: solanaSplSDK.TOKEN_PROGRAM_ID,
    })

    const nativeBalanceBn = BSBigNumberHelper.fromDecimals(nativeBalance, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const nativeBalanceAmount = BSBigNumberHelper.toNumber(nativeBalanceBn)

    const balances: TBalanceResponse[] = [
      {
        amount: nativeBalanceAmount,
        token: BSSolanaConstants.NATIVE_TOKEN,
      },
    ]

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
    return await this.#service.connection.getBlockHeight()
  }
}
