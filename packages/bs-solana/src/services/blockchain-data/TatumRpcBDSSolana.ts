import {
  TBalanceResponse,
  BSBigNumberHelper,
  IBlockchainDataService,
  TBSNetwork,
  TBSToken,
  type TContractResponse,
  type TTransactionTokenEvent,
  type TTransactionNftEvent,
  type TTransaction,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'
import solanaSDK from '@solana/web3.js'
import * as solanaSplSDK from '@solana/spl-token'
import { BSSolanaCachedMethodsHelper } from '../../helpers/BSSolanaCachedMethodsHelper'
import { IBSSolana, TBSSolanaNetworkId } from '../../types'

export class TatumRpcBDSSolana<N extends string> implements IBlockchainDataService<N> {
  static URL_BY_NETWORK_ID: Record<TBSSolanaNetworkId, string> = {
    'mainnet-beta': 'https://api.coz.io/api/v2/solana/meta/mainnet',
    devnet: 'https://api.coz.io/api/v2/solana/meta/devnet',
  }

  static getConnection(network: TBSNetwork<TBSSolanaNetworkId>) {
    return new solanaSDK.Connection(TatumRpcBDSSolana.URL_BY_NETWORK_ID[network.id])
  }

  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 // 1 minutes
  readonly #service: IBSSolana<N>
  readonly #connection: solanaSDK.Connection
  readonly #functionByProgramIdAndMethod: Record<
    string,
    Record<
      string,
      (
        instruction: solanaSDK.ParsedInstruction,
        allInstructions: solanaSDK.ParsedInstruction[]
      ) => Promise<TTransactionTokenEvent | TTransactionNftEvent>
    >
  > = {
    [solanaSplSDK.TOKEN_PROGRAM_ID.toString()]: {
      transferChecked: this.#parseSplTransferCheckedInstruction.bind(this),
      transfer: this.#parseSplTransferInstruction.bind(this),
    },
    [solanaSDK.SystemProgram.programId.toString()]: {
      transfer: this.#parseSystemInstruction.bind(this),
    },
  }

  constructor(service: IBSSolana<N>) {
    this.#service = service
    this.#connection = TatumRpcBDSSolana.getConnection(service.network)
  }

  async #parseSplTransferCheckedInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TTransactionTokenEvent | TTransactionNftEvent> {
    const info = instruction.parsed.info

    if (!info.destination || !info.source || !info.mint) {
      throw new Error('Unsupported instruction format')
    }

    const contractHash = info.mint

    const metaplex = await BSSolanaCachedMethodsHelper.getMetaplexMetadata(contractHash, this.#connection)
    if (!metaplex) {
      throw new Error('Metaplex metadata not found')
    }

    const toTokenAddress = await BSSolanaCachedMethodsHelper.getSplAddress(
      info.destination,
      contractHash,
      allInstructions,
      this.#connection
    )
    if (!toTokenAddress) {
      throw new Error('To account not found')
    }
    const to = toTokenAddress.toBase58()

    const fromTokenAddress = await BSSolanaCachedMethodsHelper.getSplAddress(
      info.source,
      contractHash,
      allInstructions,
      this.#connection
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
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

    if (metaplex?.model === 'nft') {
      if (!metaplex.collection?.address) {
        throw new Error('Collection address not found')
      }

      const collectionHash = metaplex.collection.address.toBase58()
      const nftUrl = nftTemplateUrl?.replace('{tokenHash}', contractHash).replace('{collectionHash}', contractHash)

      return {
        eventType: 'nft',
        from,
        fromUrl,
        to,
        toUrl,
        tokenHash: contractHash,
        collectionHash,
        collectionHashUrl: contractHashUrl,
        methodName: 'transferChecked',
        tokenType: 'spl',
        amount: '1',
        nftImageUrl: metaplex?.json?.image,
        name: metaplex.name,
        nftUrl,
      }
    }

    const token: TBSToken = {
      symbol: metaplex.currency.symbol,
      name: metaplex.name,
      decimals: metaplex.decimals,
      hash: contractHash,
    }

    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, token.decimals)
    const amount = BSBigNumberHelper.toNumber(amountBn)

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

    const toTokenAccount = await BSSolanaCachedMethodsHelper.getSplAccount(info.destination, this.#connection)
    if (!toTokenAccount) {
      throw new Error('To account not found')
    }
    const contractHash = toTokenAccount.mint.toBase58()

    const metaplex = await BSSolanaCachedMethodsHelper.getMetaplexMetadata(contractHash, this.#connection)
    if (!metaplex) {
      throw new Error('Metaplex metadata not found')
    }

    let to: string

    if (info.destination === toTokenAccount.address.toBase58()) {
      const toTokenAddress = await BSSolanaCachedMethodsHelper.getSplAddress(
        info.destination,
        contractHash,
        allInstructions,
        this.#connection
      )
      if (!toTokenAddress) {
        throw new Error('To account not found')
      }
      to = toTokenAddress.toBase58()
    } else {
      to = toTokenAccount.address.toBase58()
    }

    const fromTokenAddress = await BSSolanaCachedMethodsHelper.getSplAddress(
      info.source,
      contractHash,
      allInstructions,
      this.#connection
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
    const contractHashUrl = contractTemplateUrl?.replace('{hash}', contractHash)

    if (metaplex?.model === 'nft') {
      if (!metaplex.collection?.address) {
        throw new Error('Collection address not found')
      }

      const nftUrl = nftTemplateUrl?.replace('{tokenHash}', contractHash).replace('{collectionHash}', contractHash)

      return {
        eventType: 'nft',
        from,
        fromUrl,
        to,
        toUrl,
        tokenType: 'spl',
        methodName: 'transfer',
        nftImageUrl: metaplex?.json?.image,
        name: metaplex.name,
        nftUrl,
        collectionHash: metaplex.collection.address.toBase58(),
        collectionHashUrl: contractHashUrl,
        amount: '1',
        tokenHash: contractHash,
      }
    }

    const token: TBSToken = {
      symbol: metaplex.currency.symbol,
      name: metaplex.name,
      decimals: metaplex.decimals,
      hash: contractHash,
    }
    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, token.decimals)
    const amount = BSBigNumberHelper.toNumber(amountBn)

    return {
      eventType: 'token',
      amount,
      contractHash,
      from,
      fromUrl,
      to,
      toUrl,
      methodName: 'transfer',
      tokenType: 'spl',
      contractHashUrl,
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
    const amount = BSBigNumberHelper.toNumber(amountBn)

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

    const func = this.#functionByProgramIdAndMethod[programId]?.[method]
    if (func) {
      return await func(instruction, allInstructions)
    }

    throw new Error('Unsupported instruction')
  }

  async getTransaction(txid: string): Promise<TTransaction<N>> {
    const transaction = await this.#connection.getParsedTransaction(txid, {
      maxSupportedTransactionVersion: 0,
    })

    if (!transaction) throw new Error('Transaction not found')

    if (!transaction.blockTime) throw new Error('Block time not found')
    if (!transaction.meta) throw new Error('Transaction meta not found')

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
      systemFeeAmount: BSBigNumberHelper.format(0, { decimals: this.#service.feeToken.decimals }),
      date: new Date(transaction.blockTime).toISOString(),
      events,
      type: 'default',
    }
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    const publicKey = new solanaSDK.PublicKey(params.address)

    const signaturesResponse = await this.#connection.getSignaturesForAddress(publicKey, {
      limit: 15,
      before: params.nextPageParams,
    })

    const transactions: TTransaction<N>[] = []

    const promises = signaturesResponse.map(async signatureResponse => {
      const transaction = await this.getTransaction(signatureResponse.signature)
      transactions.push(transaction)
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

    const token = await BSSolanaCachedMethodsHelper.getMetaplexMetadata(tokenHash, this.#connection)

    if (!token || token.model === 'nft') {
      throw new Error(`Token not found: ${tokenHash}`)
    }

    return {
      symbol: token.currency.symbol,
      name: token.name,
      decimals: token.decimals,
      hash: tokenHash,
    }
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const publicKey = new solanaSDK.PublicKey(address)

    const nativeBalance = await this.#connection.getBalance(publicKey)
    const splBalance = await this.#connection.getParsedTokenAccountsByOwner(publicKey, {
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

      const amount = BSBigNumberHelper.toNumber(amountBn)

      balances.push({
        amount,
        token,
      })
    })

    await Promise.allSettled(promises)

    return balances
  }

  async getBlockHeight(): Promise<number> {
    return await this.#connection.getBlockHeight()
  }
}
