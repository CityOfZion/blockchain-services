import { BSError, type TWalletConnectServiceMethodHandler } from '@cityofzion/blockchain-service'
import { JsonRpcProvider } from 'ethers'
import { type TWalletConnectEthereumHandlers, WalletConnectServiceEthereum } from '@cityofzion/bs-ethereum'
import { toHex } from 'viem'
import axios from 'axios'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId, TWalletConnectServiceNeoxMethod } from '../../types'
import z from 'zod'

const getCachedTransactionParamsSchema = z.tuple([z.string(), z.string()])

type TWalletConnectNeoXHandlers = TWalletConnectEthereumHandlers & {
  eth_getTransactionCount: unknown
  eth_getCachedTransaction: z.infer<typeof getCachedTransactionParamsSchema>
}

export class WalletConnectServiceNeoX extends WalletConnectServiceEthereum<
  TBSNeoXName,
  TBSNeoXNetworkId,
  TWalletConnectServiceNeoxMethod,
  TWalletConnectNeoXHandlers
> {
  constructor(service: IBSNeoX) {
    super(service)

    this.supportedMethods.push('eth_getTransactionCount', 'eth_getCachedTransaction')
    this.autoApproveMethods.push('eth_getTransactionCount', 'eth_getCachedTransaction')

    this.handlers = {
      ...this.handlers,
      eth_getTransactionCount: this.#getTransactionCountHandler,
      eth_getCachedTransaction: this.#getCachedTransactionHandler,
      eth_sendTransaction: this.#sendTransactionHandler,
    }
  }

  #getTransactionCountHandler: TWalletConnectServiceMethodHandler<TBSNeoXName> = {
    validate: async () => {},
    process: async args => {
      const wallet = await this._service._getSigner(args.account)
      const provider = new JsonRpcProvider(this._service.network.url)
      const connectedWallet = wallet.connect(provider)
      return await connectedWallet.getNonce('pending')
    },
  }

  #getCachedTransactionHandler: TWalletConnectServiceMethodHandler<
    TBSNeoXName,
    z.infer<typeof getCachedTransactionParamsSchema>
  > = {
    validate: async params => await getCachedTransactionParamsSchema.parseAsync(params),
    process: async args => {
      const url = this._service.network.url
      const wallet = await this._service._getSigner(args.account)
      const provider = new JsonRpcProvider(url)
      const connectedWallet = wallet.connect(provider)
      const nonce = args.params[0]
      const signature = await connectedWallet.signMessage(nonce.toString())
      const hexNonce = toHex(nonce)

      // Keep using Axios because of the wallet, provider and connectedWallet don't have the eth_getCachedTransaction method
      const cachedTransactionResponse = await axios.post(url, {
        id: Date.now(),
        jsonrpc: '2.0',
        method: 'eth_getCachedTransaction',
        params: [hexNonce, signature],
      })

      return cachedTransactionResponse.data.result
    },
  }

  #sendTransactionHandler: TWalletConnectServiceMethodHandler<TBSNeoXName> = {
    validate: async params => await this._sendTransactionHandler.validate(params),
    process: async args => {
      const { transaction, connectedWallet } = await this._resolveTransactionParams(args)
      const provider = new JsonRpcProvider(this._service.network.url)
      const populatedTransaction = await connectedWallet.populateTransaction(transaction)
      const signedTransaction = await connectedWallet.signTransaction(populatedTransaction)
      const transactionHash: string = await provider.send('eth_sendRawTransaction', [signedTransaction])

      if (!transactionHash) {
        throw new BSError('Transaction error', 'TRANSACTION_ERROR')
      }

      return transactionHash
    },
  }
}
