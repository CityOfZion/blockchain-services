import {
  BSBigNumberHelper,
  BSError,
  BSKeychainHelper,
  BSUtilsHelper,
  BSBigNumber,
  type IBlockchainDataService,
  type IExchangeDataService,
  type IExplorerService,
  type INftDataService,
  type ITokenService,
  type TBSAccount,
  type TBSNetwork,
  type TGetLedgerTransport,
  type TPingNetworkResponse,
  type TTransferParams,
  type TTransferIntent,
} from '@cityofzion/blockchain-service'
import { TatumBDSBitcoin } from './services/blockchain-data/TatumBDSBitcoin'
import { CryptoCompareEDSBitcoin } from './services/exchange-data/CryptoCompareEDSBitcoin'
import { BlockchainBlockstreamESBitcoin } from './services/explorer/BlockchainBlockstreamESBitcoin'
import { LedgerServiceBitcoin } from './services/ledger/LedgerServiceBitcoin'
import { XverseNDSBitcoin } from './services/nft-data/XverseNDSBitcoin'
import { BSBitcoinConstants } from './constants/BSBitcoinConstants'
import { TokenServiceBitcoin } from './services/token/TokenServiceBitcoin'
import type {
  IBSBitcoin,
  TBSBitcoinNetworkId,
  TGetTransferDataParams,
  TGetTransferDataResponse,
  THiroNameResponse,
  TTatumApis,
  TTatumBroadcastResponse,
  TTatumFeesResponse,
  TTatumTransactionResponse,
  TTatumUtxo,
  TTatumUtxosResponse,
} from './types'
import { BSBitcoinHiroHelper } from './helpers/BSBitcoinHiroHelper'
import { BSBitcoinTatumHelper } from './helpers/BSBitcoinTatumHelper'
import { BSBitcoinBIP32SingletonHelper } from './helpers/BSBitcoinBIP32SingletonHelper'
import { BSBitcoinECPairSingletonHelper } from './helpers/BSBitcoinECPairSingletonHelper'
import * as bitcoinjs from 'bitcoinjs-lib'
import type { ECPairInterface } from 'ecpair'
import * as bip39 from 'bip39'
import * as bip38 from 'bip38'
import * as wif from 'wif'
import * as secp256k1 from '@bitcoinerlab/secp256k1'
import { c32addressDecode } from 'c32check'

export class BSBitcoin<N extends string = string> implements IBSBitcoin<N> {
  readonly #hiroApi = BSBitcoinHiroHelper.getApi()

  readonly name: N
  readonly nativeTokens = [BSBitcoinConstants.NATIVE_TOKEN]
  readonly tokens = this.nativeTokens
  readonly feeToken = BSBitcoinConstants.NATIVE_TOKEN
  readonly defaultNetwork = BSBitcoinConstants.MAINNET_NETWORK
  readonly availableNetworks: TBSNetwork<TBSBitcoinNetworkId>[]
  readonly isCustomNetworkSupported = false
  readonly isMultiTransferSupported = true

  #tatumApis!: TTatumApis
  #bitcoinjsNetwork!: bitcoinjs.Network

  bipDerivationPath!: string
  network!: TBSNetwork<TBSBitcoinNetworkId>
  networkUrls!: string[]
  blockchainDataService!: IBlockchainDataService<N>
  ledgerService: LedgerServiceBitcoin<N>
  tokenService: ITokenService = new TokenServiceBitcoin()
  explorerService: IExplorerService = new BlockchainBlockstreamESBitcoin(this)
  exchangeDataService: IExchangeDataService = new CryptoCompareEDSBitcoin(this)
  nftDataService: INftDataService = new XverseNDSBitcoin(this)

  constructor(name: N, network?: TBSNetwork<TBSBitcoinNetworkId>, getLedgerTransport?: TGetLedgerTransport<N>) {
    bitcoinjs.initEccLib(secp256k1)

    this.name = name
    this.ledgerService = new LedgerServiceBitcoin(this, getLedgerTransport)

    const nextNetwork = network || this.defaultNetwork

    this.availableNetworks = [nextNetwork]

    this.setNetwork(nextNetwork)
  }

  #getPrivateKeyPair(key: string): ECPairInterface {
    const ecpair = BSBitcoinECPairSingletonHelper.getInstance()

    return ecpair.fromWIF(key, this.#bitcoinjsNetwork)
  }

  async #signTransaction(psbt: bitcoinjs.Psbt, account: TBSAccount<N>): Promise<void> {
    if (account.isHardware) {
      if (!this.ledgerService.getLedgerTransport) {
        throw new BSError(
          'You must provide getLedgerTransport function to use Ledger',
          'GET_LEDGER_TRANSPORT_NOT_FOUND'
        )
      }

      if (!account.bipPath) {
        throw new BSError('Your account must have BIP 84 path to use Ledger', 'BIP_PATH_NOT_FOUND')
      }

      const transport = await this.ledgerService.getLedgerTransport(account)

      await this.ledgerService.signTransaction(psbt, account, transport)

      return
    }

    const keyPair = this.#getPrivateKeyPair(account.key)

    await psbt.signAllInputsAsync(keyPair)
  }

  // P2WPKH (SegWit): starts with bc1 (mainnet) or tb1 (testnet)
  #isP2WPKHAddress(address: string) {
    const lowercaseAddress = address.toLowerCase()

    return lowercaseAddress.startsWith('bc1') || lowercaseAddress.startsWith('tb1')
  }

  // P2PKH (legacy): starts with 1 (mainnet) or m/n (testnet)
  #isP2PKHAddress(address: string) {
    const lowercaseAddress = address.toLowerCase()

    return lowercaseAddress.startsWith('1') || lowercaseAddress.startsWith('m') || lowercaseAddress.startsWith('n')
  }

  // P2SH: starts with 3 (mainnet) or 2 (testnet)
  #isP2SHAddress(address: string) {
    return address.startsWith('3') || address.startsWith('2')
  }

  #getInputSize(address: string) {
    if (this.#isP2WPKHAddress(address)) {
      return BSBigNumberHelper.fromNumber('68')
    }

    if (this.#isP2PKHAddress(address)) {
      return BSBigNumberHelper.fromNumber('148')
    }

    if (this.#isP2SHAddress(address)) {
      return BSBigNumberHelper.fromNumber('91')
    }

    throw new BSError('Invalid address', 'INVALID_ADDRESS')
  }

  #getOutputSize(address: string) {
    if (this.#isP2WPKHAddress(address)) {
      return BSBigNumberHelper.fromNumber('31')
    }

    if (this.#isP2PKHAddress(address)) {
      return BSBigNumberHelper.fromNumber('34')
    }

    if (this.#isP2SHAddress(address)) {
      return BSBigNumberHelper.fromNumber('32')
    }

    throw new BSError('Invalid address', 'INVALID_ADDRESS')
  }

  #getEstimatedSize(address: string, intents: TTransferIntent[], inputsQuantity: number) {
    const inputSize = this.#getInputSize(address)
    const inputsSize = inputSize.multipliedBy(inputsQuantity)

    // Payments and change
    const outputsSize = intents.reduce(
      (accumulator, intent) => accumulator.plus(this.#getOutputSize(intent.receiverAddress)),
      this.#getOutputSize(address)
    )

    // 10 bytes represents version + locktime + counters
    const overheadSize = BSBigNumberHelper.fromNumber('10')

    return inputsSize.plus(outputsSize).plus(overheadSize)
  }

  async #getTransferData({
    senderAccount,
    intents,
    shouldValidate = true,
  }: TGetTransferDataParams<N>): Promise<TGetTransferDataResponse> {
    const { address } = senderAccount

    const { data: utxosData } = await this.#tatumApis.v4.get<TTatumUtxosResponse>('/data/utxos', {
      params: {
        address,
        chain: this.network.type === 'mainnet' ? 'bitcoin-mainnet' : 'bitcoin-testnet',
        totalValue: 1000_0000_0000, // Get the most out of UTXOs
      },
    })

    const sortedUtxos = utxosData
      .map<TTatumUtxo>(utxo => {
        const value = BSBigNumberHelper.fromNumber(utxo.valueAsString)
          .multipliedBy(BSBitcoinConstants.ONE_BTC_IN_SATOSHIS)
          .integerValue(BSBigNumber.ROUND_DOWN)

        return {
          ...utxo,
          valueAsString: value.toFixed(),
          value: value.toNumber(),
        }
      })
      .toSorted((a, b) => a.value - b.value)

    if (sortedUtxos.length === 0) {
      throw new BSError('No UTXO available', 'NO_UTXO_AVAILABLE')
    }

    const { data: feeData } = await this.#tatumApis.v3.get<TTatumFeesResponse>(
      `/blockchain/fee/${BSBitcoinConstants.NATIVE_TOKEN.symbol}`
    )

    const dustLimit = BSBigNumberHelper.fromNumber('546')
    const feeRate = BSBigNumberHelper.fromNumber(feeData.medium)
    const utxos: TTatumUtxo[] = []
    let utxosAmount = BSBigNumberHelper.fromNumber('0')
    let fee = BSBigNumberHelper.fromNumber('0')

    let amount = intents.reduce(
      (accumulator, intent) =>
        accumulator.plus(
          BSBigNumberHelper.fromNumber(intent.amount)
            .multipliedBy(BSBitcoinConstants.ONE_BTC_IN_SATOSHIS)
            .integerValue(BSBigNumber.ROUND_DOWN)
        ),
      BSBigNumberHelper.fromNumber('0')
    )

    for (const utxo of sortedUtxos) {
      utxos.push(utxo)
      utxosAmount = utxosAmount.plus(utxo.value)

      const estimatedSize = this.#getEstimatedSize(address, intents, utxos.length)

      fee = feeRate.multipliedBy(estimatedSize).integerValue(BSBigNumber.ROUND_CEIL)

      const currentAmount = amount.plus(fee)

      if (utxosAmount.isGreaterThanOrEqualTo(shouldValidate ? currentAmount : amount)) {
        break
      }
    }

    if (utxos.length === 0) {
      throw new BSError('No UTXOs to pay the transaction', 'NO_UTXO_PAY_TRANSACTION')
    }

    if (utxosAmount.minus(amount).isNegative()) {
      throw new BSError('Insufficient funds', 'INSUFFICIENT_FUNDS')
    }

    amount = amount.plus(fee)

    let change = utxosAmount.minus(amount)

    if (shouldValidate) {
      if (change.isNegative()) {
        throw new BSError('Insufficient funds', 'INSUFFICIENT_FUNDS')
      }

      if (amount.isLessThan(dustLimit)) {
        throw new BSError('Amount is lower than the dust', 'DUST_ERROR')
      }
    }

    // Reset the change
    if (change.isLessThan(dustLimit)) {
      change = BSBigNumberHelper.fromNumber('0')
    }

    return {
      utxos,
      fee,
      change,
    }
  }

  setNetwork(network: TBSNetwork<TBSBitcoinNetworkId>) {
    const isMainnetNetwork = network.type === 'mainnet'

    if (!isMainnetNetwork && network.type !== 'testnet') {
      throw new BSError('Only mainnet and testnet are supported', 'INVALID_NETWORK')
    }

    const networkUrl = BSBitcoinConstants.API_URLS_BY_NETWORK_ID[network.id]
    const networkUrls = networkUrl ? [networkUrl] : []
    const isValidNetwork = BSUtilsHelper.validateNetwork(network, this.availableNetworks, networkUrls)

    if (!isValidNetwork) {
      throw new BSError("Network isn't compatible with current network", 'NETWORK_NOT_COMPATIBLE')
    }

    this.network = network
    this.networkUrls = networkUrls
    this.#tatumApis = BSBitcoinTatumHelper.getApis(this.network)
    this.bipDerivationPath = BSBitcoinConstants.BIP84_DERIVATION_PATHS_BY_NETWORK_ID[this.network.id]
    this.#bitcoinjsNetwork = isMainnetNetwork ? bitcoinjs.networks.bitcoin : bitcoinjs.networks.testnet
    this.blockchainDataService = new TatumBDSBitcoin(this)
  }

  async pingNetwork(): Promise<TPingNetworkResponse> {
    const timeout = 5000

    const timeoutId = setTimeout(() => {
      throw new BSError('API URL timeout reached', 'TIMEOUT_REACHED')
    }, timeout)

    const timeStart = Date.now()
    const height = await this.blockchainDataService.getBlockHeight()
    const latency = Date.now() - timeStart

    clearTimeout(timeoutId)

    return { url: this.network.url, height, latency }
  }

  validateAddress(address: string): boolean {
    try {
      bitcoinjs.address.toOutputScript(address, this.#bitcoinjsNetwork)

      return true
    } catch {
      return false
    }
  }

  validateKey(key: string): boolean {
    try {
      this.#getPrivateKeyPair(key)

      return true
    } catch {
      /* empty */
    }

    try {
      const buffer = Buffer.from(key, 'hex')

      if (buffer.length !== 32) return false

      const ecpair = BSBitcoinECPairSingletonHelper.getInstance()

      ecpair.fromPrivateKey(buffer, { network: this.#bitcoinjsNetwork })

      return true
    } catch {
      /* empty */
    }

    return false
  }

  validateEncrypted(encryptedKey: string): boolean {
    try {
      if (!encryptedKey.startsWith('6P') || encryptedKey.length !== 58) return false

      const decoded = BSKeychainHelper.decodeBase58Check(encryptedKey)

      if (decoded.length !== 39) return false

      const prefix = decoded.readUInt16BE(0)

      return prefix === 0x0142 || prefix === 0x0143
    } catch {
      return false
    }
  }

  validateNameServiceDomainFormat(domainName: string): boolean {
    return domainName.endsWith('.bitcoin') || domainName.endsWith('.btc')
  }

  async generateAccountFromMnemonic(mnemonic: string[] | string, index: number): Promise<TBSAccount<N>> {
    if (!BSKeychainHelper.isValidMnemonic(mnemonic)) {
      throw new BSError('Invalid mnemonic', 'INVALID_MNEMONIC')
    }

    const mnemonicText = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonicText)
    const bip32 = BSBitcoinBIP32SingletonHelper.getInstance()
    const root = bip32.fromSeed(seed, this.#bitcoinjsNetwork)
    const bipPath = BSKeychainHelper.getBipPath(this.bipDerivationPath, index)
    const derivedPath = root.derivePath(bipPath)
    const key = derivedPath.toWIF()
    const keyPair = this.#getPrivateKeyPair(key)
    const { address } = bitcoinjs.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.#bitcoinjsNetwork })

    if (!address) {
      throw new BSError("Address can't be found", 'ADDRESS_NOT_FOUND')
    }

    return {
      address,
      key,
      type: 'wif',
      bipPath,
      blockchain: this.name,
    }
  }

  async generateAccountFromPublicKey(publicKey: string): Promise<TBSAccount<N>> {
    if (!this.validateAddress(publicKey)) {
      throw new BSError('Invalid public key', 'INVALID_PUBLIC_KEY')
    }

    return {
      address: publicKey,
      key: publicKey,
      type: 'publicKey',
      blockchain: this.name,
    }
  }

  async generateAccountFromKey(key: string): Promise<TBSAccount<N>> {
    const keyPair = this.#getPrivateKeyPair(key)

    // Generate P2WPKH address
    const { address } = bitcoinjs.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.#bitcoinjsNetwork })

    if (!address) {
      throw new BSError("Address can't be found", 'ADDRESS_NOT_FOUND')
    }

    return { address, key, type: 'wif', blockchain: this.name }
  }

  async decrypt(encryptedKey: string, password: string): Promise<TBSAccount<N>> {
    const decryptedKey = bip38.decrypt(encryptedKey, password)
    const ecpair = BSBitcoinECPairSingletonHelper.getInstance()

    const keyPair = ecpair.fromPrivateKey(decryptedKey.privateKey, {
      compressed: decryptedKey.compressed,
      network: this.#bitcoinjsNetwork,
    })

    const key = keyPair.toWIF()

    return await this.generateAccountFromKey(key)
  }

  async encrypt(key: string, password: string): Promise<string> {
    const decoded = wif.decode(key)
    const buffer = Buffer.from(decoded.privateKey)

    return bip38.encrypt(buffer, decoded.compressed, password)
  }

  async calculateTransferFee(params: TTransferParams<N>): Promise<string> {
    const { fee } = await this.#getTransferData({ ...params, shouldValidate: false })

    return BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(fee, BSBitcoinConstants.NATIVE_TOKEN.decimals), {
      decimals: BSBitcoinConstants.NATIVE_TOKEN.decimals,
    })
  }

  async resolveNameServiceDomain(domainName: string): Promise<string> {
    if (this.network.type !== 'mainnet') {
      throw new BSError('Only mainnet is supported', 'INVALID_NETWORK')
    }

    const { data } = await this.#hiroApi.get<THiroNameResponse>(`/v1/names/${domainName}`)
    const [version, hash160] = c32addressDecode(data.address)

    if (version !== 22) {
      throw new BSError("This domain isn't from mainnet", 'INVALID_DOMAIN_NAME')
    }

    const { address } = bitcoinjs.payments.p2wpkh({
      hash: Buffer.from(hash160, 'hex'),
      network: this.#bitcoinjsNetwork,
    })

    if (!address) {
      throw new BSError("Address can't be found", 'ADDRESS_NOT_FOUND')
    }

    return address
  }

  async transfer(params: TTransferParams<N>): Promise<string[]> {
    const { utxos, change } = await this.#getTransferData(params)
    const { senderAccount } = params
    const { address, isHardware } = senderAccount
    const psbt = new bitcoinjs.Psbt({ network: this.#bitcoinjsNetwork })
    const isP2PKHAddress = this.#isP2PKHAddress(address)
    const isP2SHAddress = this.#isP2SHAddress(address)
    const keyPair: ECPairInterface | undefined = isP2SHAddress ? this.#getPrivateKeyPair(senderAccount.key) : undefined

    let redeemScript: Uint8Array<ArrayBufferLike> | undefined

    if (keyPair) {
      redeemScript = bitcoinjs.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: this.#bitcoinjsNetwork,
      }).output
    }

    for (const utxo of utxos) {
      const { txHash, index, value } = utxo

      const { data: transactionData } = await this.#tatumApis.v3.get<TTatumTransactionResponse>(
        `/bitcoin/transaction/${txHash}`
      )

      const { hex } = transactionData
      const transaction = bitcoinjs.Transaction.fromHex(hex)
      const output = transaction.outs[index]

      const input: Parameters<bitcoinjs.Psbt['addInput']>[0] = {
        hash: txHash,
        index,
        witnessUtxo: {
          script: output.script,
          value: BigInt(value),
        },
      }

      if (redeemScript) input.redeemScript = redeemScript
      if (isP2PKHAddress || isHardware) input.nonWitnessUtxo = Buffer.from(hex, 'hex')

      psbt.addInput(input)
    }

    for (const intent of params.intents) {
      psbt.addOutput({
        address: intent.receiverAddress,
        value: BigInt(
          BSBigNumberHelper.fromNumber(intent.amount)
            .multipliedBy(BSBitcoinConstants.ONE_BTC_IN_SATOSHIS)
            .integerValue(BSBigNumber.ROUND_DOWN)
            .toNumber()
        ),
      })
    }

    // Verify if exists change
    if (change.isGreaterThan('0')) {
      psbt.addOutput({
        address,
        value: BigInt(change.toNumber()),
      })
    }

    // Sign the inputs
    await this.#signTransaction(psbt, senderAccount)

    const ecpair = BSBitcoinECPairSingletonHelper.getInstance()

    // Validate the signatures
    const areSignaturesValid = psbt.validateSignaturesOfAllInputs(
      (publicKey: Uint8Array, messageHash: Uint8Array, signature: Uint8Array) => {
        return ecpair.fromPublicKey(publicKey).verify(messageHash, signature)
      }
    )

    if (!areSignaturesValid) {
      throw new BSError('Invalid signatures', 'INVALID_SIGNATURES')
    }

    psbt.finalizeAllInputs()

    const transaction = psbt.extractTransaction()
    const transactionHex = transaction.toHex()
    const transactionHash = transaction.getId()

    try {
      const { data } = await this.#tatumApis.v3.post<TTatumBroadcastResponse>('/bitcoin/broadcast', {
        txData: transactionHex,
      })

      if (!data) {
        throw new BSError('Transaction failed', 'TRANSACTION_FAILED')
      }

      if (data.txId !== transactionHash) {
        throw new BSError('Invalid transaction hash', 'INVALID_TRANSACTION_HASH')
      }

      return [transactionHash]
    } catch (error: any) {
      if (error instanceof BSError) {
        throw error
      }

      if (error?.response?.data?.cause === 'dust') {
        throw new BSError('Amount is lower than the dust', 'DUST_ERROR')
      }

      throw new BSError('Transaction failed', 'TRANSACTION_FAILED', error)
    }
  }
}
