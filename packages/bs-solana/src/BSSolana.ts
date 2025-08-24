import {
  Account,
  BSBigNumberHelper,
  GetLedgerTransport,
  IBlockchainDataService,
  IExchangeDataService,
  IExplorerService,
  INftDataService,
  ITokenService,
  TNetwork,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import solanaSDK from '@solana/web3.js'
import * as solanaSplSDK from '@solana/spl-token'
import * as bip39 from 'bip39'
import solanaSnsSDK from '@bonfida/spl-name-service'
import HDKey from 'micro-key-producer/slip10.js'
import { BSSolanaConstants } from './constants/BSSolanaConstants'
import bs58 from 'bs58'
import { Web3LedgerServiceSolana } from './services/ledger/Web3LedgerServiceSolana'
import { TatumRpcBDSSolana } from './services/blockchain-data/TatumRpcBDSSolana'
import { TatumRpcNDSSolana } from './services/nft-data/TatumRpcNDSSolana'
import { SolScanESSolana } from './services/explorer/SolScanESSolana'
import { MoralisEDSSolana } from './services/exchange/MoralisEDSSolana'
import { TokenServiceSolana } from './services/token/TokenServiceSolana'
import { IBSSolana, TBSSolanaNetworkId } from './types'

const KEY_BYTES_LENGTH = 64

export class BSSolana<N extends string = string> implements IBSSolana<N> {
  readonly name: N
  readonly bip44DerivationPath: string

  readonly isMultiTransferSupported: boolean = true
  readonly isCustomNetworkSupported: boolean = false

  readonly feeToken!: Token
  readonly tokens!: Token[]
  readonly nativeTokens!: Token[]

  network!: TNetwork<TBSSolanaNetworkId>
  readonly availableNetworks: TNetwork<TBSSolanaNetworkId>[]
  readonly defaultNetwork: TNetwork<TBSSolanaNetworkId>

  ledgerService: Web3LedgerServiceSolana<N>
  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService

  #connection!: solanaSDK.Connection

  constructor(name: N, network?: TNetwork<TBSSolanaNetworkId>, getLedgerTransport?: GetLedgerTransport<N>) {
    this.name = name
    this.bip44DerivationPath = BSSolanaConstants.DEFAULT_BIP44_DERIVATION_PATH
    this.ledgerService = new Web3LedgerServiceSolana(this, getLedgerTransport)

    this.tokens = [BSSolanaConstants.NATIVE_TOKEN]
    this.nativeTokens = [BSSolanaConstants.NATIVE_TOKEN]
    this.feeToken = BSSolanaConstants.NATIVE_TOKEN

    this.availableNetworks = BSSolanaConstants.ALL_NETWORKS
    this.defaultNetwork = BSSolanaConstants.MAINNET_NETWORK

    this.setNetwork(network ?? this.defaultNetwork)
  }

  #generateKeyPairFromKey(key: string): solanaSDK.Keypair {
    let keyBuffer: Uint8Array | undefined

    try {
      keyBuffer = bs58.decode(key)
    } catch {
      keyBuffer = Uint8Array.from(key.split(',').map(Number))
    }

    return solanaSDK.Keypair.fromSecretKey(keyBuffer)
  }

  async #signTransaction(transaction: solanaSDK.Transaction, senderAccount: Account<N>) {
    if (senderAccount.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (typeof senderAccount.bip44Path !== 'string')
        throw new Error('Your account must have bip44 path to use Ledger')

      const transport = await this.ledgerService.getLedgerTransport(senderAccount)
      return await this.ledgerService.signTransaction(transport, transaction, senderAccount)
    }

    transaction.sign(this.#generateKeyPairFromKey(senderAccount.key))
    return transaction.serialize()
  }

  async #buildTransferParams(param: TransferParam) {
    const latestBlockhash = await this.#connection.getLatestBlockhash()

    const senderPublicKey = new solanaSDK.PublicKey(param.senderAccount.address)

    const transaction = new solanaSDK.Transaction()
    transaction.feePayer = senderPublicKey
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight

    for (const intent of param.intents) {
      const amountBn = BSBigNumberHelper.fromNumber(intent.amount)
      const amount = Number(BSBigNumberHelper.toDecimals(amountBn, intent.tokenDecimals ?? 0))
      const receiverPublicKey = new solanaSDK.PublicKey(intent.receiverAddress)
      const normalizedTokenHash = this.tokenService.normalizeHash(intent.tokenHash)

      const isNative = normalizedTokenHash === this.tokenService.normalizeHash(BSSolanaConstants.NATIVE_TOKEN.hash)
      if (isNative) {
        transaction.add(
          solanaSDK.SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: receiverPublicKey,
            lamports: amount,
          })
        )
        continue
      }
      const tokenMintPublicKey = new solanaSDK.PublicKey(normalizedTokenHash)

      const senderTokenAddress = await solanaSplSDK.getAssociatedTokenAddress(tokenMintPublicKey, senderPublicKey)
      const receiverTokenAddress = await solanaSplSDK.getAssociatedTokenAddress(tokenMintPublicKey, receiverPublicKey)

      try {
        await solanaSplSDK.getAccount(this.#connection, receiverTokenAddress)
      } catch (error) {
        if (
          error instanceof solanaSplSDK.TokenAccountNotFoundError ||
          error instanceof solanaSplSDK.TokenInvalidAccountOwnerError
        ) {
          transaction.add(
            solanaSplSDK.createAssociatedTokenAccountInstruction(
              senderPublicKey,
              receiverTokenAddress,
              receiverPublicKey,
              tokenMintPublicKey
            )
          )
        } else {
          throw error
        }
      }

      transaction.add(
        solanaSplSDK.createTransferInstruction(senderTokenAddress, receiverTokenAddress, senderPublicKey, amount)
      )
    }

    return {
      transaction,
      senderPublicKey,
      latestBlockhash,
    }
  }

  setNetwork(partialNetwork: TNetwork<TBSSolanaNetworkId>): void {
    this.network = partialNetwork

    this.tokenService = new TokenServiceSolana()
    this.blockchainDataService = new TatumRpcBDSSolana(this)
    this.nftDataService = new TatumRpcNDSSolana(this)
    this.explorerService = new SolScanESSolana(this)
    this.exchangeDataService = new MoralisEDSSolana(this)

    this.#connection = new solanaSDK.Connection(this.network.url)
  }

  async testNetwork(network: TNetwork<TBSSolanaNetworkId>): Promise<void> {
    const connection = new solanaSDK.Connection(network.url)
    await connection.getBlockHeight()
  }

  validateAddress(address: string): boolean {
    try {
      return solanaSDK.PublicKey.isOnCurve(address)
    } catch {
      return false
    }
  }

  validateKey(key: string): boolean {
    let keyBuffer: Uint8Array | undefined

    try {
      keyBuffer = bs58.decode(key)
    } catch {
      keyBuffer = Uint8Array.from(key.split(',').map(Number))
    }

    if (keyBuffer.length !== KEY_BYTES_LENGTH) {
      return false
    }

    return true
  }

  generateAccountFromMnemonic(mnemonic: string, index: number): Account<N> {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const hd = HDKey.fromMasterSeed(seed.toString('hex'))
    const keypair = solanaSDK.Keypair.fromSeed(hd.derive(bip44Path).privateKey)
    const key = bs58.encode(keypair.secretKey)
    const address = keypair.publicKey.toBase58()

    return {
      address,
      key,
      type: 'privateKey',
      bip44Path,
      blockchain: this.name,
    }
  }

  generateAccountFromKey(key: string): Account<N> {
    const keypair = this.#generateKeyPairFromKey(key)

    const address = keypair.publicKey.toBase58()
    const base58Key = bs58.encode(keypair.secretKey)

    return {
      address,
      key: base58Key,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  generateAccountFromPublicKey(publicKey: string): Account<N> {
    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async transfer(param: TransferParam<N>): Promise<string[]> {
    const { transaction, latestBlockhash } = await this.#buildTransferParams(param)

    const signedTransaction = await this.#signTransaction(transaction, param.senderAccount)
    const signature = await this.#connection.sendRawTransaction(signedTransaction)
    const status = await this.#connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature,
    })

    if (status.value.err) {
      throw new Error('Transaction failed: ' + status.value.err)
    }

    return [signature]
  }

  async calculateTransferFee(param: TransferParam<N>): Promise<string> {
    const { senderPublicKey, transaction } = await this.#buildTransferParams(param)

    const { blockhash } = await this.#connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash

    transaction.feePayer = senderPublicKey

    const message = transaction.compileMessage()

    const fee = await this.#connection.getFeeForMessage(message)
    if (!fee.value) {
      throw new Error('Failed to calculate fee')
    }

    const feeBn = BSBigNumberHelper.fromDecimals(fee.value, this.feeToken.decimals)
    return BSBigNumberHelper.toNumber(feeBn).toString()
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const address = await solanaSnsSDK.resolve(this.#connection, domainName)
    return address.toBase58()
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.sol')
  }
}
