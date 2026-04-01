import {
  BSBigUnitAmount,
  BSError,
  BSUtilsHelper,
  type IWalletConnectService,
  type TWalletConnectServiceHandlers,
  type TWalletConnectServiceMethodHandler,
  type TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import type {
  IBSBitcoin,
  TBSBitcoinName,
  TBSBitcoinNetworkId,
  TSignInput,
  TWalletConnectServiceBitcoinMethod,
} from '../../types'
import { BSBitcoinConstants } from '../../constants/BSBitcoinConstants'
import { SignatureOptions } from 'bitcoinjs-message'
import * as bitcoinjs from 'bitcoinjs-lib'
import * as bitcoinjsMessage from 'bitcoinjs-message'
import { z } from 'zod'

const getAccountAddressParamsSchema = z.object({
  account: z.string(),
  intentions: z.array(z.string()).optional(),
})

const signPsbtParamsSchema = z.object({
  account: z.string(),
  psbt: z.string(),
  signInputs: z
    .array(
      z.object({
        index: z.number(),
        address: z.string(),
        sighashTypes: z.array(z.number()).optional(),
      })
    )
    .optional(),
  broadcast: z.boolean().optional(),
})

const signMessageParamsSchema = z.object({
  account: z.string(),
  message: z.string(),
  address: z.string().optional(),
  protocol: z.literal('ecdsa').optional(),
})

const sendTransferParamsSchema = z.object({
  account: z.string(),
  recipientAddress: z.string(),
  amount: z.string(),
  changeAddress: z.string().optional(),
  memo: z.string().optional(),
})

// Read the Reown documentation: https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export class WalletConnectServiceBitcoin implements IWalletConnectService<
  TBSBitcoinName,
  TWalletConnectServiceBitcoinMethod
> {
  static readonly SUPPORTED_INTENTION = 'payment'

  readonly #service: IBSBitcoin

  // BIP-122 chain IDs are derived from the first 32 bytes of the genesis block hash: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-4.md
  readonly #networkIdByNetworkType: Record<TBSBitcoinNetworkId, string> = {
    mainnet: '000000000019d6689c085ae165831e93',
    testnet: '000000000933ea01ad0ee984209779ba',
  }

  readonly namespace = 'bip122'
  readonly chain: string

  // prettier-ignore
  readonly supportedMethods: TWalletConnectServiceBitcoinMethod[] = [
    'sendTransfer', 'getAccountAddresses', 'signPsbt', 'signMessage',
  ]
  readonly supportedEvents = ['bip122_addressesChanged']
  readonly calculableMethods: TWalletConnectServiceBitcoinMethod[] = ['sendTransfer']
  readonly autoApproveMethods: TWalletConnectServiceBitcoinMethod[] = ['getAccountAddresses']

  handlers: TWalletConnectServiceHandlers<
    TBSBitcoinName,
    {
      getAccountAddresses: z.infer<typeof getAccountAddressParamsSchema>
      signPsbt: z.infer<typeof signPsbtParamsSchema>
      signMessage: z.infer<typeof signMessageParamsSchema>
      sendTransfer: z.infer<typeof sendTransferParamsSchema>
    }
  >

  constructor(service: IBSBitcoin) {
    this.#service = service

    const chainId = this.#networkIdByNetworkType[this.#service.network.id]
    this.chain = `${this.namespace}:${chainId}`

    this.handlers = {
      getAccountAddresses: this.#getAccountAddressHandler,
      signPsbt: this.#signPsbtHandler,
      signMessage: this.#signMessageHandler,
      sendTransfer: this.#sendTransferHandler,
    }
  }

  #getAccountAddressHandler: TWalletConnectServiceMethodHandler<
    TBSBitcoinName,
    z.infer<typeof getAccountAddressParamsSchema>
  > = {
    validate: async params => await getAccountAddressParamsSchema.parseAsync(params),
    process: async args => {
      const { account, intentions = [] } = args.params

      if (args.account.address !== account) {
        throw new BSError('Sender account should be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
      }

      if (
        intentions.length > 1 ||
        (intentions.length === 1 && intentions[0] !== WalletConnectServiceBitcoin.SUPPORTED_INTENTION)
      ) {
        throw new BSError('Intentions not supported', 'INTENTIONS_NOT_SUPPORTED')
      }

      let publicKey: string | undefined

      if (!args.account.isHardware) {
        const keyPair = this.#service._getKeyPair(args.account.key)
        publicKey = Buffer.from(keyPair.publicKey).toString('hex')
      }

      return [
        {
          address: args.account.address,
          publicKey,
          path: args.account.bipPath,
          intention: WalletConnectServiceBitcoin.SUPPORTED_INTENTION,
        },
      ]
    },
  }

  #signPsbtHandler: TWalletConnectServiceMethodHandler<TBSBitcoinName, z.infer<typeof signPsbtParamsSchema>> = {
    validate: async params => await signPsbtParamsSchema.parseAsync(params),
    process: async args => {
      const { account, psbt, signInputs, broadcast = false } = args.params

      if (args.account.address !== account) {
        throw new BSError('Sender account should be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
      }

      const parsedPsbt = bitcoinjs.Psbt.fromBase64(psbt, { network: this.#service._bitcoinjsNetwork })
      let txid: string | undefined

      await this.#service._signTransaction({ psbt: parsedPsbt, account: args.account, signInputs })

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

        txid = await this.#service._broadcastTransaction(transaction.toHex())

        if (transactionHash !== txid) {
          throw new BSError('Invalid transaction hash', 'INVALID_TRANSACTION_HASH')
        }
      }

      return { psbt: parsedPsbt.toBase64(), txid }
    },
  }

  #signMessageHandler: TWalletConnectServiceMethodHandler<TBSBitcoinName, z.infer<typeof signMessageParamsSchema>> = {
    validate: async params => await signMessageParamsSchema.parseAsync(params),
    process: async args => {
      const { account, message, address } = args.params

      if (args.account.address !== account) {
        throw new BSError('Sender account be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
      }

      const signingAddress = address || args.account.address

      if (args.account.isHardware) {
        const transport = await this.#service._getLedgerTransport(args.account)
        const response = await this.#service.ledgerService.signMessage({ message, account: args.account, transport })

        return { address: signingAddress, ...response }
      }

      let segwitType: SignatureOptions['segwitType']

      if (this.#service._isP2WPKHAddress(args.account.address)) {
        segwitType = 'p2wpkh'
      } else if (this.#service._isP2SHAddress(args.account.address)) {
        segwitType = 'p2sh(p2wpkh)'
      }

      const keyPair = this.#service._getKeyPair(args.account.key)

      const messageBuffer = Buffer.from(message, BSUtilsHelper.isBase64(message) ? 'base64' : 'utf8')
      const messageHash = bitcoinjsMessage.magicHash(messageBuffer)

      const bufferPrivateKey = Buffer.isBuffer(keyPair.privateKey)
        ? keyPair.privateKey
        : Buffer.from(keyPair.privateKey)

      const signature = bitcoinjsMessage.sign(messageBuffer, bufferPrivateKey, keyPair.compressed, {
        segwitType,
      })

      bitcoinjsMessage.verify(messageBuffer, signingAddress, signature)

      return {
        address: signingAddress,
        signature: signature.toString('hex'),
        messageHash: messageHash.toString('hex'),
      }
    },
  }

  #sendTransferHandler: TWalletConnectServiceMethodHandler<TBSBitcoinName, z.infer<typeof sendTransferParamsSchema>> = {
    validate: async params => await sendTransferParamsSchema.parseAsync(params),
    process: async args => {
      const transferParams = this.#transformSendTransferParams(args)

      const [{ txId }] = await this.#service.transfer({
        senderAccount: args.account,
        intents: [
          {
            amount: transferParams.amount,
            receiverAddress: transferParams.recipientAddress,
            token: BSBitcoinConstants.NATIVE_TOKEN,
          },
        ],
      })

      return { txid: txId }
    },
  }

  #transformSendTransferParams(
    args: TWalletConnectServiceRequestMethodParams<TBSBitcoinName, z.infer<typeof sendTransferParamsSchema>>
  ) {
    const { account, amount, recipientAddress, changeAddress, memo } = args.params

    if (args.account.address !== account) {
      throw new BSError('Sender account be equal account', 'SENDER_ACCOUNT_SHOULD_BE_ACCOUNT')
    }

    if (changeAddress && account !== changeAddress) {
      throw new BSError('Account should be equal change address', 'ACCOUNT_SHOULD_BE_CHANGE_ADDRESS')
    }

    if (memo) {
      throw new BSError('Memo not supported', 'MEMO_NOT_SUPPORTED')
    }

    return {
      recipientAddress,
      amount: new BSBigUnitAmount(amount, BSBitcoinConstants.NATIVE_TOKEN.decimals).toHuman().toFormatted(),
    }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<TBSBitcoinName>): Promise<string> {
    if (!this.calculableMethods.includes(args.method as TWalletConnectServiceBitcoinMethod)) {
      throw new BSError(`Method ${args.method} is not supported for fee calculation`, 'UNSUPPORTED_METHOD')
    }

    const params = await this.#sendTransferHandler.validate(args.params).catch(error => {
      throw new BSError('Params validation failed: ' + error.message, 'INVALID_PARAMS')
    })

    const transferParams = this.#transformSendTransferParams({ ...args, params })

    return await this.#service.calculateTransferFee({
      senderAccount: args.account,
      intents: [
        {
          amount: transferParams.amount,
          receiverAddress: transferParams.recipientAddress,
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ],
    })
  }
}
