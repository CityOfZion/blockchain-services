import {
  BSBigUnitAmount,
  BSError,
  type IWalletConnectService,
  type TBSNetworkId,
  type TWalletConnectServiceHandlers,
  type TWalletConnectServiceMethodHandler,
  type TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import type { IBSEthereum, TWalletConnectServiceEthereumMethod } from '../../types'
import { z } from 'zod'
import { isHexString, JsonRpcProvider, Transaction, toUtf8String, type TransactionRequest } from 'ethers'
import { BSEthereumConstants } from '../../constants/BSEthereumConstants'

const personalSignParamsSchema = z.tuple([z.string(), z.string()])

const typedDataParamSchema = z.object({
  primaryType: z.string(),
  types: z.record(z.string(), z.any()),
  domain: z.object({
    chainId: z.union([z.number(), z.bigint(), z.string()]).optional(),
    name: z.string().optional(),
    salt: z.string().optional(),
    verifyingContract: z.string().optional(),
    version: z.string().optional(),
  }),
  message: z.record(z.string(), z.any()),
  account: z.string().optional(),
})

const jsonStringifiedTypedDataParamSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return JSON.parse(val)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON string' })
      return z.NEVER
    }
  })
  .pipe(typedDataParamSchema)

const signTypedDataParamsSchema = z.tuple([
  z.string(),
  z.union([jsonStringifiedTypedDataParamSchema, typedDataParamSchema]),
])

const signTransactionParamsSchema = z.tuple([
  z.object({
    to: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    data: z.string().optional(),
    gas: z.union([z.string(), z.number()]).optional(),
    maxPriorityFeePerGas: z.union([z.string(), z.number()]).optional(),
    maxFeePerGas: z.union([z.string(), z.number()]).optional(),
    nonce: z.number().optional(),
    chainId: z.union([z.number(), z.string()]).optional(),
    gasLimit: z.union([z.string(), z.number()]).optional(),
    type: z.union([z.string(), z.number()]).optional(),
    gasPrice: z.union([z.string(), z.number()]).optional(),
  }),
])

const sendRawTransactionParamsSchema = z.tuple([z.string()])

const getNonceParamsSchema = z.union([z.string(), z.number()]).optional()

export type TWalletConnectEthereumHandlers = {
  personal_sign: z.infer<typeof personalSignParamsSchema>
  eth_sign: z.infer<typeof personalSignParamsSchema>
  eth_signTypedData: z.infer<typeof signTypedDataParamsSchema>
  eth_signTypedData_v3: z.infer<typeof signTypedDataParamsSchema>
  eth_signTypedData_v4: z.infer<typeof signTypedDataParamsSchema>
  eth_signTransaction: z.infer<typeof signTransactionParamsSchema>
  eth_sendTransaction: z.infer<typeof signTransactionParamsSchema>
  eth_sendRawTransaction: z.infer<typeof sendRawTransactionParamsSchema>
  eth_getNonce: z.infer<typeof getNonceParamsSchema>
  eth_call: z.infer<typeof signTransactionParamsSchema>
  eth_requestAccounts: unknown
  eth_switchEthereumChain: unknown
  eth_addEthereumChain: unknown
  wallet_switchEthereumChain: unknown
  wallet_addEthereumChain: unknown
  wallet_getPermissions: unknown
  wallet_requestPermissions: unknown
}

export class WalletConnectServiceEthereum<
  N extends string,
  A extends TBSNetworkId,
  M extends string = TWalletConnectServiceEthereumMethod,
  H extends Record<string, any> = TWalletConnectEthereumHandlers,
> implements IWalletConnectService<N, M> {
  readonly namespace: string = 'eip155'
  readonly chain: string

  // prettier-ignore
  supportedMethods: M[] = [
    'personal_sign', 'eth_sign', 'eth_signTransaction', 'eth_signTypedData',
    'eth_signTypedData_v3', 'eth_signTypedData_v4', 'eth_sendTransaction', 'eth_getNonce', 'eth_call',
    'eth_requestAccounts', 'eth_sendRawTransaction', 'eth_addEthereumChain', 'eth_switchEthereumChain',
    'wallet_switchEthereumChain', 'wallet_getPermissions', 'wallet_requestPermissions', 'wallet_addEthereumChain',
  ] as M[]
  readonly supportedEvents: string[] = ['chainChanged', 'accountsChanged', 'disconnect', 'connect']
  calculableMethods: M[] = ['eth_sendTransaction', 'eth_sendRawTransaction'] as M[]

  // prettier-ignore
  autoApproveMethods: M[] = [
    'eth_requestAccounts', 'eth_addEthereumChain', 'eth_switchEthereumChain', 'wallet_switchEthereumChain',
    'wallet_getPermissions', 'wallet_requestPermissions', 'wallet_addEthereumChain', 'eth_getNonce', 'eth_call',
  ] as M[]

  protected readonly _service: IBSEthereum<N, A>

  handlers: TWalletConnectServiceHandlers<N, H>

  constructor(service: IBSEthereum<N, A>) {
    this._service = service
    this.chain = `${this.namespace}:${this._service.network.id.toString()}`

    this.handlers = {
      personal_sign: this._personalSignHandler,
      eth_sign: this._personalSignHandler,
      eth_signTypedData: this._signTypedDataHandlers,
      eth_signTypedData_v3: this._signTypedDataHandlers,
      eth_signTypedData_v4: this._signTypedDataHandlers,
      eth_signTransaction: this._signTransactionHandler,
      eth_sendTransaction: this._sendTransactionHandler,
      eth_sendRawTransaction: this._sendRawTransactionHandler,
      eth_getNonce: this._getNonce,
      eth_call: this._callHandler,
      eth_requestAccounts: this._requestAccount,
      eth_switchEthereumChain: this._nullHandlers,
      eth_addEthereumChain: this._nullHandlers,
      wallet_switchEthereumChain: this._nullHandlers,
      wallet_addEthereumChain: this._nullHandlers,
      wallet_getPermissions: this._emptyHandlers,
      wallet_requestPermissions: this._emptyHandlers,
    } as unknown as TWalletConnectServiceHandlers<N, H>
  }

  _personalSignHandler: TWalletConnectServiceMethodHandler<N, z.infer<typeof personalSignParamsSchema>> = {
    validate: async params => await personalSignParamsSchema.parseAsync(params),
    process: async args => {
      const wallet = await this._service._getSigner(args.account)
      const convertedMessage = this._convertHexToUtf8(args.params[0])

      return await wallet.signMessage(convertedMessage)
    },
  }

  _signTypedDataHandlers: TWalletConnectServiceMethodHandler<N, z.infer<typeof signTypedDataParamsSchema>> = {
    validate: async params => await signTypedDataParamsSchema.parseAsync(params),
    process: async args => {
      const wallet = await this._service._getSigner(args.account)

      const { domain, types, message } = args.params[1]

      // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
      delete types?.EIP712Domain

      return await wallet.signTypedData(domain, types, message)
    },
  }

  _signTransactionHandler: TWalletConnectServiceMethodHandler<N, z.infer<typeof signTransactionParamsSchema>> = {
    validate: async params => await signTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const { connectedWallet, transaction } = await this._resolveTransactionParams(args)
      return await connectedWallet.signTransaction(transaction)
    },
  }

  _sendTransactionHandler: TWalletConnectServiceMethodHandler<N, z.infer<typeof signTransactionParamsSchema>> = {
    validate: async params => await signTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const { transaction, connectedWallet } = await this._resolveTransactionParams(args)
      const { hash } = await connectedWallet.sendTransaction(transaction)
      return hash
    },
  }

  _sendRawTransactionHandler: TWalletConnectServiceMethodHandler<N, z.infer<typeof sendRawTransactionParamsSchema>> = {
    validate: async params => await sendRawTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const provider = new JsonRpcProvider(this._service.network.url)
      const { hash } = await provider.broadcastTransaction(args.params[0])

      return hash
    },
  }

  _callHandler: TWalletConnectServiceMethodHandler<N, z.infer<typeof signTransactionParamsSchema>> = {
    validate: async params => await signTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const { transaction, connectedWallet } = await this._resolveTransactionParams(args)
      return await connectedWallet.call(transaction)
    },
  }

  _getNonce: TWalletConnectServiceMethodHandler<N, z.infer<typeof getNonceParamsSchema>> = {
    validate: async params => await getNonceParamsSchema.parseAsync(params),
    process: async args => {
      const wallet = await this._service._getSigner(args.account)

      return await wallet.getNonce(args.params || 'pending')
    },
  }

  _requestAccount: TWalletConnectServiceMethodHandler<N> = {
    validate: async () => {},
    process: async args => {
      const wallet = await this._service._getSigner(args.account)

      return [await wallet.getAddress()]
    },
  }

  _nullHandlers: TWalletConnectServiceMethodHandler<N> = {
    validate: async () => {},
    process: async () => {
      return 'null'
    },
  }

  _emptyHandlers: TWalletConnectServiceMethodHandler<N> = {
    validate: async () => {},
    process: async () => {
      return []
    },
  }

  _convertHexToUtf8(value: string) {
    if (isHexString(value)) {
      return toUtf8String(value)
    }

    return value
  }

  async _resolveTransactionParams(
    args: TWalletConnectServiceRequestMethodParams<N, z.infer<typeof signTransactionParamsSchema>>
  ) {
    const params = args.params[0]

    const provider = new JsonRpcProvider(this._service.network.url)
    const wallet = await this._service._getSigner(args.account)
    const connectedWallet = wallet.connect(provider)

    const transaction: TransactionRequest = {
      to: params.to,
      value: params.value,
      data: params.data,
    }

    transaction.chainId = parseInt(params.chainId?.toString() ?? this._service.network.id)

    transaction.nonce = params.nonce
    if (!transaction.nonce) {
      transaction.nonce = await connectedWallet.getNonce('pending')
    }

    if (params.type) {
      const typeAsNumber = parseInt(params.type.toString())
      if (!isNaN(typeAsNumber)) {
        transaction.type = typeAsNumber
      }
    }

    if (transaction.type === 2) {
      transaction.maxFeePerGas = params.maxFeePerGas
      transaction.maxPriorityFeePerGas = params.maxPriorityFeePerGas

      if (!transaction.maxFeePerGas || !transaction.maxPriorityFeePerGas) {
        const feeData = await provider.getFeeData()

        transaction.maxFeePerGas = transaction.maxFeePerGas ?? feeData.maxFeePerGas ?? undefined
        transaction.maxPriorityFeePerGas = transaction.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas ?? undefined
      }
    } else {
      transaction.gasPrice = params.gasPrice?.toString()

      if (!transaction.gasPrice) {
        const { gasPrice } = await provider.getFeeData()

        transaction.gasPrice = gasPrice?.toString()
      }
    }

    transaction.gasLimit = params.gasLimit ?? params.gas
    if (!transaction.gasLimit) {
      try {
        transaction.gasLimit = await connectedWallet.estimateGas({
          ...transaction,
          gasPrice: undefined,
          maxFeePerGas: undefined,
          maxPriorityFeePerGas: undefined,
        })
      } catch {
        transaction.gasLimit = BSEthereumConstants.DEFAULT_GAS_LIMIT_BN.toString()
      }
    }

    return { connectedWallet, transaction }
  }

  async calculateRequestFee(args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    let transactionToEstimate: TransactionRequest

    if (args.method === 'eth_sendTransaction') {
      const params = await this._sendTransactionHandler.validate(args.params).catch(error => {
        throw new BSError('Params validation failed: ' + error.message, 'INVALID_PARAMS')
      })

      const { transaction } = await this._resolveTransactionParams({ ...args, params })

      transactionToEstimate = transaction
    } else if (args.method === 'eth_sendRawTransaction') {
      const params = await this._sendRawTransactionHandler.validate(args.params).catch(error => {
        throw new BSError('Params validation failed: ' + error.message, 'INVALID_PARAMS')
      })

      transactionToEstimate = Transaction.from(params[0])
    } else {
      throw new BSError(`Method ${args.method} is not supported for fee calculation`, 'UNSUPPORTED_METHOD')
    }

    const provider = new JsonRpcProvider(this._service.network.url)
    const wallet = await this._service._getSigner(args.account)
    const connectedWallet = wallet.connect(provider)

    const { gasPrice } = await provider.getFeeData()
    const gasPriceBn = new BSBigUnitAmount(gasPrice?.toString() || '0', this._service.feeToken.decimals)

    const estimatedGas = await connectedWallet.estimateGas(transactionToEstimate!)
    const estimatedGasBn = new BSBigUnitAmount(estimatedGas.toString(), this._service.feeToken.decimals)

    return gasPriceBn.multipliedBy(estimatedGasBn).toHuman().toFormatted()
  }
}
