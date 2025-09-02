import {
  BalanceResponse,
  BlockchainDataService,
  BSBigNumberHelper,
  ContractResponse,
  ExportTransactionsByAddressParams,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  Network,
  RpcResponse,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants, BSSolanaNetworkId } from '../../constants/BSSolanaConstants'
import solanaSDK from '@solana/web3.js'
import * as solanaSplSDK from '@solana/spl-token'
import { BSSolanaCachedMethodsHelper } from '../../helpers/BSSolanaCachedMethodsHelper'
import { BSSolanaHelper } from '../../helpers/BSSolanaHelper'

export class TatumRpcBDSSolana implements BlockchainDataService {
  static tatumUrlByNetworkId: Record<BSSolanaNetworkId, string> = {
    'mainnet-beta': 'https://solana-mainnet.gateway.tatum.io/',
    devnet: 'https://solana-devnet.gateway.tatum.io',
  }

  static getTatumConnection(network: Network<BSSolanaNetworkId>, apiKey: string) {
    return new solanaSDK.Connection(this.tatumUrlByNetworkId[network.id], {
      httpHeaders: {
        'x-api-key': apiKey,
      },
    })
  }

  maxTimeToConfirmTransactionInMs: number = 1000 * 60

  #network: Network<BSSolanaNetworkId>
  #feeToken: Token

  #connection: solanaSDK.Connection
  #mainnetApiKey: string
  #testnetApiKey: string

  #functionByProgramIdAndMethod: Record<
    string,
    Record<
      string,
      (
        instruction: solanaSDK.ParsedInstruction,
        allInstructions: solanaSDK.ParsedInstruction[]
      ) => Promise<TransactionTransferAsset | TransactionTransferNft>
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

  constructor(network: Network<BSSolanaNetworkId>, feeToken: Token, mainnetApiKey: string, testnetApiKey: string) {
    this.#network = network
    this.#feeToken = feeToken
    this.#mainnetApiKey = mainnetApiKey
    this.#testnetApiKey = testnetApiKey
    this.#connection = TatumRpcBDSSolana.getTatumConnection(
      network,
      BSSolanaHelper.isMainnet(network) ? mainnetApiKey : testnetApiKey
    )
  }

  getFullTransactionsByAddress(_params: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse> {
    throw new Error('Method not implemented.')
  }

  exportFullTransactionsByAddress(_params: ExportTransactionsByAddressParams): Promise<string> {
    throw new Error('Method not implemented.')
  }

  async #parseSplTransferCheckedInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TransactionTransferAsset | TransactionTransferNft> {
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
    const from = fromTokenAddress.toBase58()

    if (metaplex?.model === 'nft') {
      if (!metaplex.collection?.address) {
        throw new Error('Collection address not found')
      }

      return {
        type: 'nft',
        from,
        to,
        tokenHash: contractHash,
        collectionHash: metaplex.collection.address.toBase58(),
      }
    }

    const token: Token = {
      symbol: metaplex.currency.symbol,
      name: metaplex.name,
      decimals: metaplex.decimals,
      hash: contractHash,
    }
    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, token.decimals)
    const amount = BSBigNumberHelper.toNumber(amountBn)

    return {
      type: 'token',
      amount,
      contractHash,
      from,
      to,
      token,
    }
  }

  async #parseSplTransferInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TransactionTransferAsset | TransactionTransferNft> {
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
    const from = fromTokenAddress.toBase58()

    if (metaplex?.model === 'nft') {
      if (!metaplex.collection?.address) {
        throw new Error('Collection address not found')
      }

      return {
        type: 'nft',
        from,
        to,
        collectionHash: metaplex.collection.address.toBase58(),
        tokenHash: contractHash,
      }
    }

    const token: Token = {
      symbol: metaplex.currency.symbol,
      name: metaplex.name,
      decimals: metaplex.decimals,
      hash: contractHash,
    }
    const amountBn = BSBigNumberHelper.fromDecimals(info.tokenAmount.amount, token.decimals)
    const amount = BSBigNumberHelper.toNumber(amountBn)

    return {
      type: 'token',
      amount,
      contractHash,
      from,
      to,
      token,
    }
  }

  async #parseSystemInstruction(
    instruction: solanaSDK.ParsedInstruction
  ): Promise<TransactionTransferAsset | TransactionTransferNft> {
    const info = instruction.parsed.info
    const method = instruction.parsed.type

    if (info.lamports === undefined || info.source === undefined || method !== 'transfer' || !info.destination) {
      throw new Error('Unsupported instruction format')
    }

    const amountBn = BSBigNumberHelper.fromDecimals(info.lamports, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const amount = BSBigNumberHelper.toNumber(amountBn)

    return {
      type: 'token',
      amount,
      from: info.source,
      to: info.destination,
      contractHash: BSSolanaConstants.NATIVE_TOKEN.hash,
      token: BSSolanaConstants.NATIVE_TOKEN,
    }
  }

  async #parseInstruction(
    instruction: solanaSDK.ParsedInstruction,
    allInstructions: solanaSDK.ParsedInstruction[]
  ): Promise<TransactionTransferAsset | TransactionTransferNft> {
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

  async getTransaction(txid: string): Promise<TransactionResponse> {
    const transaction = await this.#connection.getParsedTransaction(txid, {
      maxSupportedTransactionVersion: 0,
    })

    if (!transaction) throw new Error('Transaction not found')

    if (!transaction.blockTime) throw new Error('Block time not found')
    if (!transaction.meta) throw new Error('Transaction meta not found')

    const transfers: (TransactionTransferAsset | TransactionTransferNft)[] = []

    const allInstructions = [
      ...transaction.transaction.message.instructions,
      ...(transaction.meta.innerInstructions?.flatMap(item => item.instructions) ?? []),
    ].filter((item): item is solanaSDK.ParsedInstruction => 'parsed' in item)

    for (const instruction of allInstructions) {
      try {
        const transfer = await this.#parseInstruction(instruction, allInstructions)
        if (transfer) transfers.push(transfer)
      } catch {
        /* empty */
      }
    }

    const feeBn = BSBigNumberHelper.fromDecimals(transaction.meta.fee, this.#feeToken.decimals)
    const fee = BSBigNumberHelper.toNumber(feeBn)

    return {
      block: transaction.slot,
      hash: transaction.transaction.signatures[0],
      notifications: [],
      time: new Date(transaction.blockTime).getTime() / 1000,
      transfers,
      fee,
      type: 'default',
    }
  }

  async getTransactionsByAddress(params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const publicKey = new solanaSDK.PublicKey(params.address)

    const signaturesResponse = await this.#connection.getSignaturesForAddress(publicKey, {
      limit: 15,
      before: params.nextPageParams,
    })

    const transactions: TransactionResponse[] = []

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

  async getContract(_contractHash: string): Promise<ContractResponse> {
    throw new Error('Method not implemented.')
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
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

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const publicKey = new solanaSDK.PublicKey(address)

    const nativeBalance = await this.#connection.getBalance(publicKey)
    const splBalance = await this.#connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: solanaSplSDK.TOKEN_PROGRAM_ID,
    })

    const nativeBalanceBn = BSBigNumberHelper.fromDecimals(nativeBalance, BSSolanaConstants.NATIVE_TOKEN.decimals)
    const nativeBalanceAmount = BSBigNumberHelper.toNumber(nativeBalanceBn)

    const balances: BalanceResponse[] = [
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

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []

    const urls = BSSolanaConstants.RPC_LIST_BY_NETWORK_ID[this.#network.id]
    if (!urls) {
      throw new Error('RPC list not found')
    }

    const promises = urls.map(url => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async resolve => {
        const timeout = setTimeout(() => {
          resolve()
        }, 5000)

        try {
          const connection = TatumRpcBDSSolana.getTatumConnection(
            {
              ...this.#network,
              url,
            },
            BSSolanaHelper.isMainnet(this.#network) ? this.#mainnetApiKey : this.#testnetApiKey
          )

          const timeStart = Date.now()
          const height = await connection.getBlockHeight()
          const latency = Date.now() - timeStart

          list.push({
            url,
            height,
            latency,
          })
        } catch {
          /* empty */
        } finally {
          resolve()
          clearTimeout(timeout)
        }
      })
    })

    await Promise.allSettled(promises)

    return list
  }
}
