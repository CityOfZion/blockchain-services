import {
  BSUtilsHelper,
  BSKeychainHelper,
  BSError,
  type TBSAccount,
  type TGetLedgerTransport,
  type IBlockchainDataService,
  type IExchangeDataService,
  type IExplorerService,
  type INftDataService,
  type ITokenService,
  type TBSNetwork,
  type TPingNetworkResponse,
  type TTransferParams,
  type TTransactionDefault,
  BSBigHumanAmount,
  BSBigUnitAmount,
} from '@cityofzion/blockchain-service'

import { BSSolanaConstants } from './constants/BSSolanaConstants'
import { Web3LedgerServiceSolana } from './services/ledger/Web3LedgerServiceSolana'
import { RpcBDSSolana } from './services/blockchain-data/RpcBDSSolana'
import { RpcNDSSolana } from './services/nft-data/RpcNDSSolana'
import { SolScanESSolana } from './services/explorer/SolScanESSolana'
import { DefiLlamaCryptoCompareMoralisEDSSolana } from './services/exchange/DefiLlamaCryptoCompareMoralisEDSSolana'
import { TokenServiceSolana } from './services/token/TokenServiceSolana'
import type { IBSSolana, TBSSolanaName, TBSSolanaNetworkId } from './types'
import * as solanaKit from '@solana/kit'
import * as solanaMemo from '@solana-program/memo'
import * as solanaSystem from '@solana-program/system'
import * as solanaToken from '@solana-program/token'
import axios from 'axios'
import { WalletConnectServiceSolana } from './services/wallet-connect/WalletConnectServiceSolana'
import type { ReadonlyUint8Array } from '@solana/kit'

const KEY_BYTES_LENGTH = 64

export class BSSolana implements IBSSolana {
  readonly name = 'solana'
  readonly bipDerivationPath = BSSolanaConstants.DEFAULT_BIP_DERIVATION_PATH
  readonly isMultiTransferSupported = true
  readonly isCustomNetworkSupported = false
  readonly nativeTokens = [BSSolanaConstants.NATIVE_TOKEN]
  readonly tokens = this.nativeTokens
  readonly feeToken = BSSolanaConstants.NATIVE_TOKEN
  readonly availableNetworks = BSSolanaConstants.ALL_NETWORKS
  readonly defaultNetwork = BSSolanaConstants.MAINNET_NETWORK

  network!: TBSNetwork<TBSSolanaNetworkId>
  networkUrls!: string[]

  ledgerService: Web3LedgerServiceSolana
  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService<TBSSolanaName>
  nftDataService!: INftDataService
  explorerService!: IExplorerService
  tokenService!: ITokenService
  walletConnectService!: WalletConnectServiceSolana

  _solanaKitRpc!: solanaKit.Rpc<solanaKit.SolanaRpcApi>

  constructor(network?: TBSNetwork<TBSSolanaNetworkId>, getLedgerTransport?: TGetLedgerTransport<TBSSolanaName>) {
    this.ledgerService = new Web3LedgerServiceSolana(this, getLedgerTransport)

    this.setNetwork(network || this.defaultNetwork)
  }

  async _signTransaction(
    transaction: solanaKit.Transaction,
    senderAccount: TBSAccount<TBSSolanaName>
  ): Promise<solanaKit.Base64EncodedWireTransaction> {
    if (senderAccount.isHardware) {
      if (!this.ledgerService.getLedgerTransport) {
        throw new BSError('You must provide getLedgerTransport function to use Ledger', 'NO_GET_LEGER_TRANSPORT')
      }

      if (!senderAccount.bipPath) {
        throw new BSError('Account must have BIP path to use Ledger', 'NO_BIP_PATH')
      }

      const transport = await this.ledgerService.getLedgerTransport(senderAccount)

      return await this.ledgerService.signTransaction(transport, transaction, senderAccount)
    }

    const keypair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(senderAccount.key))
    const signedTransaction = await solanaKit.partiallySignTransaction([keypair], transaction)

    return solanaKit.getBase64EncodedWireTransaction(signedTransaction)
  }

  async #buildTransferParams(params: TTransferParams<TBSSolanaName>) {
    if (params.memo && !this.validateMemo(params.memo)) {
      throw new BSError(`Memo must be at most ${BSSolanaConstants.MEMO_MAX_BYTES} bytes`, 'INVALID_MEMO')
    }

    const signer = solanaKit.createNoopSigner(solanaKit.address(params.senderAccount.address))
    const instructions: solanaKit.Instruction[] = []

    for (const intent of params.intents) {
      const amount = new BSBigHumanAmount(intent.amount, intent.token.decimals).toUnit().toBigInt()
      const receiverAddress = solanaKit.address(intent.receiverAddress)
      const isNativeToken = this.tokenService.isNativeToken(intent.token.hash)

      if (isNativeToken) {
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

      const receiverAccountInfo = await this._solanaKitRpc.getAccountInfo(receiverATA, { encoding: 'base64' }).send()

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

    if (params.memo) {
      instructions.push(solanaMemo.getAddMemoInstruction({ memo: params.memo, signers: [signer] }))
    }

    const { value: latestBlockhash } = await this._solanaKitRpc.getLatestBlockhash().send()

    const transactionMessage = solanaKit.pipe(
      solanaKit.createTransactionMessage({ version: 0 }),
      tx => solanaKit.setTransactionMessageFeePayerSigner(signer, tx),
      tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => solanaKit.appendTransactionMessageInstructions(instructions, tx)
    )

    return { transactionMessage }
  }

  async #getFeeByMessageBytes(messageBytes: ReadonlyUint8Array): Promise<string> {
    const messageBase64 = solanaKit.getBase64Decoder().decode(messageBytes)

    const feeResponse = await this._solanaKitRpc
      .getFeeForMessage(messageBase64 as any, { commitment: 'confirmed' })
      .send()

    if (!feeResponse.value) {
      throw new BSError('Failed to calculate fee', 'NO_CALCULATE_FEE')
    }

    return new BSBigUnitAmount(feeResponse.value.toString(), this.feeToken.decimals).toHuman().toFormatted()
  }

  setNetwork(network: TBSNetwork<TBSSolanaNetworkId>): void {
    const networkUrls = BSSolanaConstants.RPC_LIST_BY_NETWORK_ID[network.id] || []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new Error(`Network with id ${network.id} is not available for ${this.name}`)
    }

    this.network = network
    this.networkUrls = networkUrls

    this.tokenService = new TokenServiceSolana(this)
    this.blockchainDataService = new RpcBDSSolana(this)
    this.nftDataService = new RpcNDSSolana(this)
    this.explorerService = new SolScanESSolana(this)
    this.exchangeDataService = new DefiLlamaCryptoCompareMoralisEDSSolana(this)
    this.walletConnectService = new WalletConnectServiceSolana(this)

    this._solanaKitRpc = solanaKit.createSolanaRpc(this.network.url)
  }

  // This method is done manually because we need to ensure that the request is aborted after timeout
  async pingNetwork(url: string): Promise<TPingNetworkResponse> {
    const abortController = new AbortController()

    const timeout = setTimeout(() => {
      abortController.abort()
    }, 5000)

    const timeStart = Date.now()
    const blockHeight = await this._solanaKitRpc.getBlockHeight().send({ abortSignal: abortController.signal })
    const latency = Date.now() - timeStart

    clearTimeout(timeout)

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

  validateMemo(memo: string): boolean {
    return new TextEncoder().encode(memo).length <= BSSolanaConstants.MEMO_MAX_BYTES
  }

  async generateAccountFromMnemonic(mnemonic: string, index: number): Promise<TBSAccount<TBSSolanaName>> {
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const keyBuffer = BSKeychainHelper.generateEd25519KeyFromMnemonic(mnemonic, bipPath)
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
      bipPath,
      blockchain: this.name,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<TBSSolanaName>> {
    const keyBuffer = solanaKit.getBase58Encoder().encode(key)
    const signer = await solanaKit.createKeyPairSignerFromBytes(keyBuffer)

    return {
      address: signer.address,
      key,
      type: 'privateKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<TBSSolanaName>> {
    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async transfer(params: TTransferParams<TBSSolanaName>): Promise<TTransactionDefault<TBSSolanaName>[]> {
    const { transactionMessage } = await this.#buildTransferParams(params)
    const compiledTransaction = solanaKit.compileTransaction(transactionMessage)
    const fee = await this.#getFeeByMessageBytes(compiledTransaction.messageBytes)
    const { intents, senderAccount, memo } = params
    const encodedSignedTransaction = await this._signTransaction(compiledTransaction, senderAccount)
    const txId = await this._solanaKitRpc.sendTransaction(encodedSignedTransaction, { encoding: 'base64' }).send()
    const { address } = senderAccount
    const addressUrl = this.explorerService.buildAddressUrl(address)

    return [
      {
        blockchain: this.name,
        isPending: true,
        relatedAddress: address,
        txId,
        txIdUrl: this.explorerService.buildTransactionUrl(txId),
        date: new Date().toJSON(),
        networkFeeAmount: fee,
        memo,
        view: 'default',
        events: intents.map(({ amount, receiverAddress, token }) => {
          const tokenHash = token.hash

          return {
            eventType: 'token',
            amount,
            methodName: this.tokenService.isNativeToken(tokenHash) ? 'transfer' : 'transferChecked',
            from: address,
            fromUrl: addressUrl,
            to: receiverAddress,
            toUrl: this.explorerService.buildAddressUrl(receiverAddress),
            tokenUrl: this.explorerService.buildContractUrl(tokenHash),
            token,
          }
        }),
      },
    ]
  }

  async calculateTransferFee(params: TTransferParams<TBSSolanaName>): Promise<string> {
    const { transactionMessage } = await this.#buildTransferParams(params)
    const compiledTransaction = solanaKit.compileTransaction(transactionMessage)

    return await this.#getFeeByMessageBytes(compiledTransaction.messageBytes)
  }

  async resolveNameServiceDomain(domainName: string) {
    const domain = domainName.replace(/\.sol$/, '.sns')
    const response = await axios.get(`https://sdk-proxy-v2.sns.id/resolve/${domain}`)

    if (response.status !== 200) {
      throw new BSError(`Failed to resolve domain ${domainName}`, 'DOMAIN_NOT_FOUND')
    }

    const { s, result } = response.data

    if (s !== 'ok' || !result) {
      throw new BSError(`Domain ${domainName} not found`, 'DOMAIN_NOT_FOUND')
    }

    return result
  }

  validateNameServiceDomainFormat(domainName: string) {
    return domainName.endsWith('.sol') || domainName.endsWith('.sns')
  }
}
