import {
  TBSAccount,
  BSBigNumberHelper,
  BSUtilsHelper,
  TGetLedgerTransport,
  IBlockchainDataService,
  IExchangeDataService,
  IExplorerService,
  INftDataService,
  ITokenService,
  TBSNetwork,
  TBSToken,
  TTransferParam,
  TPingNetworkResponse,
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
import axios from 'axios'

const KEY_BYTES_LENGTH = 64

export class BSSolana<N extends string = string> implements IBSSolana<N> {
  readonly name: N
  readonly bip44DerivationPath: string

  readonly isMultiTransferSupported: boolean = true
  readonly isCustomNetworkSupported: boolean = false

  readonly feeToken!: TBSToken
  readonly tokens!: TBSToken[]
  readonly nativeTokens!: TBSToken[]

  network!: TBSNetwork<TBSSolanaNetworkId>
  rpcNetworkUrls!: string[]
  readonly availableNetworks: TBSNetwork<TBSSolanaNetworkId>[]
  readonly defaultNetwork: TBSNetwork<TBSSolanaNetworkId>

  ledgerService: Web3LedgerServiceSolana<N>
  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService

  #connection!: solanaSDK.Connection

  constructor(name: N, network?: TBSNetwork<TBSSolanaNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
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

  async #signTransaction(transaction: solanaSDK.Transaction, senderAccount: TBSAccount<N>) {
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

  async #buildTransferParams(param: TTransferParam) {
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

  setNetwork(network: TBSNetwork<TBSSolanaNetworkId>): void {
    const rpcNetworkUrls = BSSolanaConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, rpcNetworkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.rpcNetworkUrls = rpcNetworkUrls

    this.tokenService = new TokenServiceSolana()
    this.blockchainDataService = new TatumRpcBDSSolana(this)
    this.nftDataService = new TatumRpcNDSSolana(this)
    this.explorerService = new SolScanESSolana(this)
    this.exchangeDataService = new MoralisEDSSolana(this)

    this.#connection = new solanaSDK.Connection(this.network.url)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNode(url: string): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()

    const response = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        id: 1234,
        method: 'getBlockHeight',
      },
      { timeout: 5000, signal: abortController.signal }
    )

    clearTimeout(timeout)

    const latency = Date.now() - timeStart

    return {
      latency,
      url,
      height: response.data.result,
    }
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

    return keyBuffer?.length === KEY_BYTES_LENGTH
  }

  generateAccountFromMnemonic(mnemonic: string, index: number): TBSAccount<N> {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const hd = HDKey.fromMasterSeed(seed)
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

  generateAccountFromKey(key: string): TBSAccount<N> {
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

  generateAccountFromPublicKey(publicKey: string): TBSAccount<N> {
    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async transfer(param: TTransferParam<N>): Promise<string[]> {
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

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
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
