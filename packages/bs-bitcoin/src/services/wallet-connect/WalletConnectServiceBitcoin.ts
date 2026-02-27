import {
  BSBigNumberHelper,
  BSError,
  BSUtilsHelper,
  type IWalletConnectService,
  type TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import type {
  IBSBitcoin,
  TBSBitcoinNetworkId,
  TSignInput,
  TWalletConnectServiceBitcoinGetAccountAddressResponse,
  TWalletConnectServiceBitcoinSendTransferResponse,
  TWalletConnectServiceBitcoinSignMessageResponse,
  TWalletConnectServiceBitcoinSignPsbtResponse,
  TWalletConnectServiceBitcoinTransformSendTransferParamsResponse,
} from '../../types'
import { BSBitcoinConstants } from '../../constants/BSBitcoinConstants'
import { LedgerServiceBitcoin } from '../ledger/LedgerServiceBitcoin'
import { SignatureOptions } from 'bitcoinjs-message'
import * as bitcoinjs from 'bitcoinjs-lib'
import * as bitcoinjsMessage from 'bitcoinjs-message'

// Read the Reown documentation: https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export class WalletConnectServiceBitcoin<N extends string> implements IWalletConnectService<N> {
  readonly #service: IBSBitcoin<N>

  // BIP-122 chain IDs are derived from the first 32 bytes of the genesis block hash: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-4.md
  readonly #networkIdByNetworkType: Record<TBSBitcoinNetworkId, string> = {
    mainnet: '000000000019d6689c085ae165831e93',
    testnet: '000000000933ea01ad0ee984209779ba',
  }

  readonly namespace = 'bip122'
  readonly chain: string
  readonly supportedMethods = ['sendTransfer', 'getAccountAddresses', 'signPsbt', 'signMessage']
  readonly supportedEvents = [`${this.namespace}_addressesChanged`]
  readonly calculableMethods = ['sendTransfer']
  readonly autoApproveMethods = ['getAccountAddresses']

  constructor(service: IBSBitcoin<N>) {
    this.#service = service

    const chainId = this.#networkIdByNetworkType[this.#service.network.id]

    this.chain = `${this.namespace}:${chainId}`
  }

  [methodName: string]: any

  #transformSendTransferParams({
    account: senderAccount,
    params,
  }: TWalletConnectServiceRequestMethodParams<N>): TWalletConnectServiceBitcoinTransformSendTransferParamsResponse {
    const { account, amount, recipientAddress, changeAddress, memo } = params || {}

    if (!account) {
      throw new BSError('Account not found', 'ACCOUNT_NOT_FOUND')
    }

    if (senderAccount.address !== account) {
      throw new BSError('Sender account be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }

    if (changeAddress && account !== changeAddress) {
      throw new BSError('Account should be equal change address', 'ACCOUNT_SHOULD_BE_CHANGE_ADDRESS')
    }

    if (memo) {
      throw new BSError('Memo not supported', 'MEMO_NOT_SUPPORTED')
    }

    if (!recipientAddress) {
      throw new BSError('Recipient address not found', 'RECIPIENT_ADDRESS_NOT_FOUND')
    }

    if (!amount) {
      throw new BSError('Amount not found', 'AMOUNT_NOT_FOUND')
    }

    const { decimals } = BSBitcoinConstants.NATIVE_TOKEN

    return {
      recipientAddress,
      amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(amount, decimals), {
        decimals,
      }),
    }
  }

  getAccountAddresses({
    account: senderAccount,
    params,
  }: TWalletConnectServiceRequestMethodParams<N>): TWalletConnectServiceBitcoinGetAccountAddressResponse {
    const intention = 'payment'
    const { address } = senderAccount
    const { account, intentions } = params || {}

    if (!account) {
      throw new BSError('Account not found', 'ACCOUNT_NOT_FOUND')
    }

    if (address !== account) {
      throw new BSError('Sender account should be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }

    if (intentions?.length > 1 || (intentions?.length === 1 && intentions[0] !== intention)) {
      throw new BSError('Intentions not supported', 'INTENTIONS_NOT_SUPPORTED')
    }

    let publicKey: string | undefined

    if (!senderAccount.isHardware) {
      const keyPair = this.#service.getKeyPair(senderAccount.key)

      publicKey = Buffer.from(keyPair.publicKey).toString('hex')
    }

    return [{ address, publicKey, path: senderAccount.bipPath, intention }]
  }

  async signPsbt({
    account: senderAccount,
    params,
  }: TWalletConnectServiceRequestMethodParams<N>): Promise<TWalletConnectServiceBitcoinSignPsbtResponse> {
    const { account, psbt, signInputs, broadcast = false } = params || {}

    if (!account) {
      throw new BSError('Account not found', 'ACCOUNT_NOT_FOUND')
    }

    if (senderAccount.address !== account) {
      throw new BSError('Sender account should be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }

    if (!psbt) {
      throw new BSError('PSBT not found', 'PSBT_NOT_FOUND')
    }

    const parsedPsbt = bitcoinjs.Psbt.fromBase64(psbt, { network: this.#service.bitcoinjsNetwork })
    let txid: string | undefined

    await this.#service.signTransaction({ psbt: parsedPsbt, account: senderAccount, signInputs })

    if (signInputs && signInputs.length > 0) {
      const parsedSignInputs = signInputs as TSignInput[]

      parsedSignInputs.forEach(signInput => {
        parsedPsbt.finalizeInput(signInput.index)
      })
    } else {
      parsedPsbt.finalizeAllInputs()
    }

    if (broadcast) {
      const transaction = parsedPsbt.extractTransaction()
      const transactionHash = transaction.getId()

      txid = await this.#service.broadcastTransaction(transaction.toHex())

      if (transactionHash !== txid) {
        throw new BSError('Invalid transaction hash', 'INVALID_TRANSACTION_HASH')
      }
    }

    return { psbt: parsedPsbt.toBase64(), txid }
  }

  async signMessage({
    account: senderAccount,
    params,
  }: TWalletConnectServiceRequestMethodParams<N>): Promise<TWalletConnectServiceBitcoinSignMessageResponse> {
    const senderAddress = senderAccount.address
    const { account, message, address, protocol } = params || {}

    if (!account) {
      throw new BSError('Account not found', 'ACCOUNT_NOT_FOUND')
    }

    if (senderAddress !== account) {
      throw new BSError('Sender account be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }

    if (!message) {
      throw new BSError('Invalid message', 'INVALID_MESSAGE')
    }

    if (protocol && protocol !== 'ecdsa') {
      throw new BSError('Protocol not supported', 'PROTOCOL_NOT_SUPPORTED')
    }

    const signingAddress = address || senderAddress

    if (senderAccount.isHardware) {
      const transport = await this.#service.getLedgerTransport(senderAccount)
      const ledgerService = this.#service.ledgerService as LedgerServiceBitcoin<N>
      const response = await ledgerService.signMessage({ message, account: senderAccount, transport })

      return { address: signingAddress, ...response }
    }

    let segwitType: SignatureOptions['segwitType']

    if (this.#service.isP2WPKHAddress(senderAddress)) segwitType = 'p2wpkh'
    else if (this.#service.isP2SHAddress(senderAddress)) segwitType = 'p2sh(p2wpkh)'

    const keyPair = this.#service.getKeyPair(senderAccount.key)
    const messageBuffer = Buffer.from(message, BSUtilsHelper.isBase64(message) ? 'base64' : 'utf8')
    const messageHash = bitcoinjsMessage.magicHash(messageBuffer)
    const bufferPrivateKey = Buffer.isBuffer(keyPair.privateKey) ? keyPair.privateKey : Buffer.from(keyPair.privateKey)

    const signature = bitcoinjsMessage.sign(messageBuffer, bufferPrivateKey, keyPair.compressed, {
      segwitType,
    })

    bitcoinjsMessage.verify(messageBuffer, senderAddress, signature)

    return {
      address: signingAddress,
      signature: signature.toString('hex'),
      messageHash: messageHash.toString('hex'),
    }
  }

  async sendTransfer(
    params: TWalletConnectServiceRequestMethodParams<N>
  ): Promise<TWalletConnectServiceBitcoinSendTransferResponse> {
    const newParams = this.#transformSendTransferParams(params)

    const [txid] = await this.#service.transfer({
      senderAccount: params.account,
      intents: [
        {
          amount: newParams.amount,
          receiverAddress: newParams.recipientAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })

    return { txid }
  }

  async calculateRequestFee(params: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    const newParams = this.#transformSendTransferParams(params)

    return await this.#service.calculateTransferFee({
      senderAccount: params.account,
      intents: [
        {
          amount: newParams.amount,
          receiverAddress: newParams.recipientAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })
  }
}
