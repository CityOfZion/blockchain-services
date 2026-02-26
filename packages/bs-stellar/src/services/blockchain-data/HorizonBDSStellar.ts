import {
  BSBigNumberHelper,
  type TContractResponse,
  type IBlockchainDataService,
  type TBalanceResponse,
  type TBSBigNumber,
  type TBSToken,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransaction,
} from '@cityofzion/blockchain-service'
import type { IBSStellar } from '../../types'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'

export class HorizonBDSStellar<N extends string> implements IBlockchainDataService<N> {
  maxTimeToConfirmTransactionInMs: number = 1 * 60 * 1000 // 1 minute

  #service: IBSStellar<N>

  constructor(service: IBSStellar<N>) {
    this.#service = service
  }

  async #parseTransaction(transaction: stellarSDK.Horizon.ServerApi.TransactionRecord): Promise<TTransaction<N>> {
    const events: TTransaction<N>['events'] = []
    const operations = await transaction.operations()

    const promises = operations.records.map(async (operation, index) => {
      if (
        operation.type !== stellarSDK.Horizon.HorizonApi.OperationResponseType.payment &&
        operation.type !== stellarSDK.Horizon.HorizonApi.OperationResponseType.pathPayment &&
        operation.type !== stellarSDK.Horizon.HorizonApi.OperationResponseType.pathPaymentStrictSend &&
        operation.type !== stellarSDK.Horizon.HorizonApi.OperationResponseType.createAccount
      )
        return

      let token: TBSToken
      let amountBn: TBSBigNumber
      let to: string
      let from: string
      let methodName: string
      let tokenType: string

      if (operation.type === stellarSDK.Horizon.HorizonApi.OperationResponseType.createAccount) {
        token = BSStellarConstants.NATIVE_TOKEN
        amountBn = BSBigNumberHelper.fromNumber(operation.starting_balance)
        to = operation.account
        from = operation.funder
        methodName = stellarSDK.Horizon.HorizonApi.OperationResponseType.createAccount
        tokenType = 'native'
      } else if (operation.asset_type === 'native') {
        token = BSStellarConstants.NATIVE_TOKEN
        amountBn = BSBigNumberHelper.fromNumber(operation.amount)
        to = operation.to
        from = operation.from
        methodName = operation.type
        tokenType = 'native'
      } else if (
        (operation.asset_type === 'credit_alphanum4' || operation.asset_type === 'credit_alphanum12') &&
        operation.asset_code &&
        operation.asset_issuer
      ) {
        token = {
          hash: operation.asset_issuer,
          name: operation.asset_code,
          symbol: operation.asset_code,
          decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
        }
        amountBn = BSBigNumberHelper.fromNumber(operation.amount)
        to = operation.to
        from = operation.from
        methodName = operation.type
        tokenType = 'sac'
      } else {
        // TODO: implement support for NFT
        return
      }

      const toUrl = this.#service.explorerService.buildAddressUrl(to)
      const fromUrl = this.#service.explorerService.buildAddressUrl(from)

      events.splice(index, 0, {
        eventType: 'token',
        amount: BSBigNumberHelper.format(amountBn, { decimals: token.decimals }),
        to,
        toUrl,
        from,
        fromUrl,
        contractHash: token.hash,
        contractHashUrl: this.#service.explorerService.buildContractUrl(token.hash),
        methodName,
        tokenType,
        token,
      })
    })

    await Promise.allSettled(promises)

    const txIdUrl = this.#service.explorerService.buildTransactionUrl(transaction.hash)

    return {
      block: transaction.ledger_attr,
      txId: transaction.hash,
      txIdUrl,
      date: new Date(transaction.created_at).toJSON(),
      notificationCount: 0,
      invocationCount: 0,
      type: 'default',
      events,
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(transaction.fee_charged, this.#service.feeToken.decimals),
        { decimals: this.#service.feeToken.decimals }
      ),
    }
  }

  async getTransaction(txid: string): Promise<TTransaction<N>> {
    const transaction = await this.#service.horizonServer.transactions().transaction(txid).call()
    return this.#parseTransaction(transaction)
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    const query = this.#service.horizonServer.transactions().forAccount(params.address)
    if (params.nextPageParams) {
      query.cursor(params.nextPageParams)
    }

    const response = await query.call()

    const nextPageParams =
      response.records.length > 0 ? response.records[response.records.length - 1].paging_token : undefined

    const transactions: TTransaction<N>[] = []

    const promises = response.records.map(async record => {
      const parsedTransaction = await this.#parseTransaction(record)
      transactions.push(parsedTransaction)
    })

    await Promise.allSettled(promises)

    return {
      transactions,
      nextPageParams,
    }
  }

  async getContract(_contractHash: string): Promise<TContractResponse> {
    throw new Error('Method not supported')
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    if (this.#service.tokenService.predicateByHash(tokenHash, BSStellarConstants.NATIVE_TOKEN.hash)) {
      return BSStellarConstants.NATIVE_TOKEN
    }

    const response = await this.#service.horizonServer.assets().forIssuer(tokenHash).limit(1).call()

    const { asset_code: code, asset_issuer: issuer } = response.records[0] || {}
    if (!code || !issuer) {
      throw new Error(`Token not found: ${tokenHash}`)
    }

    return {
      hash: tokenHash,
      name: code,
      symbol: code,
      decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
    }
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    const account = await this.#service.horizonServer.loadAccount(address)

    const balances: TBalanceResponse[] = []

    const promises = account.balances.map(async balance => {
      if (balance.asset_type === 'native') {
        balances.push({ token: this.#service.feeToken, amount: balance.balance })
      } else if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
        balances.push({
          token: {
            decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
            hash: balance.asset_issuer,
            name: balance.asset_code,
            symbol: balance.asset_code,
          },
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(balance.balance), {
            decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
          }),
        })
      }
    })

    await Promise.all(promises)

    return balances
  }

  async getBlockHeight(): Promise<number> {
    const response = await this.#service.sorobanServer.getLatestLedger()
    return response.sequence
  }
}
