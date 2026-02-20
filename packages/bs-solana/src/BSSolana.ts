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
  BSKeychainHelper,
  type IWalletConnectService,
  BSError,
} from '@cityofzion/blockchain-service'

import { BSSolanaConstants } from './constants/BSSolanaConstants'
import { Web3LedgerServiceSolana } from './services/ledger/Web3LedgerServiceSolana'
import { RpcBDSSolana } from './services/blockchain-data/RpcBDSSolana'
import { RpcNDSSolana } from './services/nft-data/RpcNDSSolana'
import { SolScanESSolana } from './services/explorer/SolScanESSolana'
import { MoralisEDSSolana } from './services/exchange/MoralisEDSSolana'
import { TokenServiceSolana } from './services/token/TokenServiceSolana'
import { IBSSolana, TBSSolanaNetworkId } from './types'
import * as solanaKit from '@solana/kit'
import * as solanaSystem from '@solana-program/system'
import * as solanaToken from '@solana-program/token'
import axios from 'axios'
import { WalletConnectServiceSolana } from './services/wallet-connect/WalletConnectServiceSolana'

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
  blockchainDataService!: IBlockchainDataService<N>
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService
  walletConnectService!: IWalletConnectService<N>

  solanaKitRpc!: solanaKit.Rpc<solanaKit.SolanaRpcApi>

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

  async signTransaction(
    transaction: solanaKit.Transaction,
    senderAccount: TBSAccount<N>
  ): Promise<solanaKit.Base64EncodedWireTransaction> {
    if (senderAccount.isHardware) {
      if (!this.ledgerService.getLedgerTransport)
        throw new Error('You must provide getLedgerTransport function to use Ledger')

      if (typeof senderAccount.bip44Path !== 'string')
        throw new Error('Your account must have bip44 path to use Ledger')

      const transport = await this.ledgerService.getLedgerTransport(senderAccount)
      return await this.ledgerService.signTransaction(transport, transaction, senderAccount)
    }

    const keypair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(senderAccount.key))
    const signedTransaction = await solanaKit.partiallySignTransaction([keypair], transaction)
    return solanaKit.getBase64EncodedWireTransaction(signedTransaction)
  }

  async #buildTransferParams(param: TTransferParam<N>) {
    const signer = solanaKit.createNoopSigner(solanaKit.address(param.senderAccount.address))

    const instructions: solanaKit.Instruction[] = []

    for (const intent of param.intents) {
      const amountBn = BSBigNumberHelper.fromNumber(intent.amount)
      const amount = Number(BSBigNumberHelper.toDecimals(amountBn, intent.token.decimals))
      const receiverAddress = solanaKit.address(intent.receiverAddress)

      const isNative = this.tokenService.predicate(intent.token, BSSolanaConstants.NATIVE_TOKEN)
      if (isNative) {
        const transferInstruction = solanaSystem.getTransferSolInstruction({
          source: signer,
          destination: receiverAddress,
          amount,
        })

        instructions.push(transferInstruction)

        continue
      }

      const tokenMint = solanaKit.address(this.tokenService.normalizeHash(intent.token.hash))

      const [senderATA] = await solanaToken.findAssociatedTokenPda({
        mint: tokenMint,
        owner: signer.address,
        tokenProgram: solanaToken.TOKEN_PROGRAM_ADDRESS,
      })

      const [receiverATA] = await solanaToken.findAssociatedTokenPda({
        mint: tokenMint,
        owner: receiverAddress,
        tokenProgram: solanaToken.TOKEN_PROGRAM_ADDRESS,
      })

      const receiverAccountInfo = await this.solanaKitRpc.getAccountInfo(receiverATA, { encoding: 'base64' }).send()

      if (!receiverAccountInfo.value) {
        // Create associated token account for receiver
        const createAtaInstruction = solanaToken.getCreateAssociatedTokenInstruction({
          payer: signer,
          owner: receiverAddress,
          mint: tokenMint,
          ata: receiverATA,
        })

        instructions.push(createAtaInstruction)
      }

      const transferInstruction = solanaToken.getTransferCheckedInstruction({
        source: senderATA,
        destination: receiverATA,
        mint: tokenMint,
        authority: signer,
        amount: amount,
        decimals: intent.token.decimals,
      })

      instructions.push(transferInstruction)
    }

    const { value: latestBlockhash } = await this.solanaKitRpc.getLatestBlockhash().send()

    const transactionMessage = solanaKit.pipe(
      solanaKit.createTransactionMessage({ version: 0 }),
      tx => solanaKit.setTransactionMessageFeePayerSigner(signer, tx),
      tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => solanaKit.appendTransactionMessageInstructions(instructions, tx)
    )

    return {
      transactionMessage,
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
    this.blockchainDataService = new RpcBDSSolana(this)
    this.nftDataService = new RpcNDSSolana(this)
    this.explorerService = new SolScanESSolana(this)
    this.exchangeDataService = new MoralisEDSSolana(this)
    this.walletConnectService = new WalletConnectServiceSolana(this)

    this.solanaKitRpc = solanaKit.createSolanaRpc(this.network.url)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNode(url: string): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()

    const blockHeight = await this.solanaKitRpc.getBlockHeight().send({ abortSignal: abortController.signal })

    clearTimeout(timeout)

    const latency = Date.now() - timeStart

    return {
      latency,
      url,
      height: Number(blockHeight),
    }
  }

  validateAddress(address: string): boolean {
    try {
      return solanaKit.isAddress(address)
    } catch {
      return false
    }
  }

  validateKey(key: string): boolean {
    try {
      const keyBuffer = solanaKit.getBase58Encoder().encode(key)
      return keyBuffer?.length === KEY_BYTES_LENGTH
    } catch {
      return false
    }
  }

  async generateAccountFromMnemonic(mnemonic: string, index: number): Promise<TBSAccount<N>> {
    const bip44Path = BSKeychainHelper.getBip44Path(this.bip44DerivationPath, index)

    const keyBuffer = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bip44Path)
    const signer = await solanaKit.createKeyPairSignerFromPrivateKeyBytes(keyBuffer)

    const publicKeyBytes = solanaKit.getBase58Encoder().encode(signer.address)

    const secretKey64 = new Uint8Array(64)
    secretKey64.set(keyBuffer, 0)
    secretKey64.set(publicKeyBytes, 32)

    const base58Key = solanaKit.getBase58Decoder().decode(secretKey64)

    return {
      address: signer.address,
      key: base58Key,
      type: 'privateKey',
      bip44Path,
      blockchain: this.name,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<N>> {
    const keyBuffer = solanaKit.getBase58Encoder().encode(key)
    const signer = await solanaKit.createKeyPairSignerFromBytes(keyBuffer)

    return {
      address: signer.address,
      key,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<N>> {
    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async transfer(param: TTransferParam<N>): Promise<string[]> {
    const { transactionMessage } = await this.#buildTransferParams(param)

    const compiledTransaction = solanaKit.compileTransaction(transactionMessage)

    const encodedSignedTransaction = await this.signTransaction(compiledTransaction, param.senderAccount)

    const signature = await this.solanaKitRpc.sendTransaction(encodedSignedTransaction, { encoding: 'base64' }).send()

    return [signature]
  }

  async calculateTransferFee(param: TTransferParam<N>): Promise<string> {
    const { transactionMessage } = await this.#buildTransferParams(param)
    const compiledTransaction = solanaKit.compileTransaction(transactionMessage)

    const messageBase64 = solanaKit.getBase64Decoder().decode(compiledTransaction.messageBytes)

    const feeResponse = await this.solanaKitRpc
      .getFeeForMessage(messageBase64 as any, { commitment: 'confirmed' })
      .send()

    if (!feeResponse.value) {
      throw new Error('Failed to calculate fee')
    }

    const feeBn = BSBigNumberHelper.fromDecimals(feeResponse.value.toString(), this.feeToken.decimals)
    return BSBigNumberHelper.toNumber(feeBn).toString()
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    const domain = domainName.replace('.sol', '')
    const response = await axios.get(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${domain}`)

    if (response.status !== 200) {
      throw new BSError(`Failed to resolve domain ${domainName}`, 'DOMAIN_NOT_FOUND')
    }

    const { s, result } = response.data

    if (s !== 'ok' || !result) {
      throw new BSError(`Domain ${domainName} not found`, 'DOMAIN_NOT_FOUND')
    }

    return result
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.sol')
  }
}
