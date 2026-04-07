import {
  BSBigNumberHelper,
  type TContractResponse,
  type IBlockchainDataService,
  type TBalanceResponse,
  type TBSBigNumber,
  type TBSToken,
  type TGetTransactionsByAddressParams,
  type TGetTransactionsByAddressResponse,
  type TTransactionDefault,
  type TTransactionDefaultEvent,
} from '@cityofzion/blockchain-service'
import type { IBSStellar } from '../../types'
import * as stellarSDK from '@stellar/stellar-sdk'
import { BSStellarConstants } from '../../constants/BSStellarConstants'

export class HorizonBDSStellar implements IBlockchainDataService {
  maxTimeToConfirmTransactionInMs: number = 1 * 60 * 1000 // 1 minute

  #service: IBSStellar

  constructor(service: IBSStellar) {
    this.#service = service
  }

  #getEventFromCreateAccont(operation: stellarSDK.Horizon.ServerApi.OperationRecord): TTransactionDefaultEvent {
    const castOperation = operation as stellarSDK.Horizon.ServerApi.CreateAccountOperationRecord

    const token = BSStellarConstants.NATIVE_TOKEN

    return {
      eventType: 'token',
      amount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(castOperation.starting_balance), {
        decimals: token.decimals,
      }),
      methodName: operation.type,
      from: castOperation.funder,
      fromUrl: this.#service.explorerService.buildAddressUrl(castOperation.funder),
      to: castOperation.account,
      toUrl: this.#service.explorerService.buildAddressUrl(castOperation.account),
      tokenUrl: this.#service.explorerService.buildContractUrl(token.hash),
      token,
    }
  }

  #getEventFromPayment(operation: stellarSDK.Horizon.ServerApi.OperationRecord): TTransactionDefaultEvent | undefined {
    const castOperation = operation as
      | stellarSDK.Horizon.ServerApi.PaymentOperationRecord
      | stellarSDK.Horizon.ServerApi.PathPaymentOperationRecord
      | stellarSDK.Horizon.ServerApi.PathPaymentStrictSendOperationRecord

    let token: TBSToken
    let amountBn: TBSBigNumber
    let to: string
    let from: string

    if (castOperation.asset_type === 'native') {
      token = BSStellarConstants.NATIVE_TOKEN
      amountBn = BSBigNumberHelper.fromNumber(castOperation.amount)
      to = castOperation.to
      from = castOperation.from
    } else if (
      (castOperation.asset_type === 'credit_alphanum4' || castOperation.asset_type === 'credit_alphanum12') &&
      castOperation.asset_code &&
      castOperation.asset_issuer
    ) {
      token = {
        hash: castOperation.asset_issuer,
        name: castOperation.asset_code,
        symbol: castOperation.asset_code,
        decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
      }
      amountBn = BSBigNumberHelper.fromNumber(castOperation.amount)
      to = castOperation.to
      from = castOperation.from
    } else {
      // TODO: implement support for NFT
      return
    }

    return {
      eventType: 'token',
      amount: BSBigNumberHelper.format(amountBn, { decimals: token.decimals }),
      methodName: castOperation.type,
      from,
      fromUrl: this.#service.explorerService.buildAddressUrl(from),
      to,
      toUrl: this.#service.explorerService.buildAddressUrl(to),
      tokenUrl: this.#service.explorerService.buildContractUrl(token.hash),
      token,
    }
  }

  #getEventFromChangeTrust(operation: stellarSDK.Horizon.ServerApi.OperationRecord): TTransactionDefaultEvent {
    const castOperation = operation as stellarSDK.Horizon.ServerApi.ChangeTrustOperationRecord

    return {
      eventType: 'generic',
      from: castOperation.source_account,
      fromUrl: this.#service.explorerService.buildAddressUrl(castOperation.source_account),
      methodName: castOperation.type,
      data: {
        limit: castOperation.limit,
        token: castOperation.asset_code,
      },
    }
  }

  async #parseTransaction(transaction: stellarSDK.Horizon.ServerApi.TransactionRecord): Promise<TTransactionDefault> {
    const events: TTransactionDefaultEvent[] = []
    const operations = await this.#service._horizonServer.operations().forTransaction(transaction.hash).call()

    const promises = operations.records.map(async (operation, index) => {
      const getEventFnByOperationType: Record<
        string,
        (operation: stellarSDK.Horizon.ServerApi.OperationRecord) => TTransactionDefaultEvent | undefined
      > = {
        [stellarSDK.Horizon.HorizonApi.OperationResponseType.createAccount]: this.#getEventFromCreateAccont.bind(this),
        [stellarSDK.Horizon.HorizonApi.OperationResponseType.payment]: this.#getEventFromPayment.bind(this),
        [stellarSDK.Horizon.HorizonApi.OperationResponseType.pathPayment]: this.#getEventFromPayment.bind(this),
        [stellarSDK.Horizon.HorizonApi.OperationResponseType.pathPaymentStrictSend]:
          this.#getEventFromPayment.bind(this),
        [stellarSDK.Horizon.HorizonApi.OperationResponseType.changeTrust]: this.#getEventFromChangeTrust.bind(this),
      }

      const event = getEventFnByOperationType[operation.type]?.(operation)
      if (event) {
        events.splice(index, 0, event)
      }
    })

    await Promise.allSettled(promises)

    const txId = transaction.hash
    const txIdUrl = this.#service.explorerService.buildTransactionUrl(txId)

    return {
      txId,
      txIdUrl,
      block: transaction.ledger_attr,
      date: new Date(transaction.created_at).toJSON(),
      networkFeeAmount: BSBigNumberHelper.format(
        BSBigNumberHelper.fromDecimals(transaction.fee_charged, this.#service.feeToken.decimals),
        { decimals: this.#service.feeToken.decimals }
      ),
      view: 'default',
      events,
    }
  }

  async getTransaction(txid: string): Promise<TTransactionDefault> {
    const transaction = await this.#service._horizonServer.transactions().transaction(txid).call()
    return this.#parseTransaction(transaction)
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<TTransactionDefault>> {
    const query = this.#service._horizonServer.transactions().forAccount(params.address).limit(15).order('desc')

    if (params.nextPageParams) {
      query.cursor(params.nextPageParams)
    }

    const response = await query.call()

    const nextPageParams =
      response.records.length > 0 ? response.records[response.records.length - 1].paging_token : undefined

    const transactions: TTransactionDefault[] = []

    const promises = response.records.map(async (record, index) => {
      const parsedTransaction = await this.#parseTransaction(record)
      transactions.splice(index, 0, parsedTransaction)
    })

    await Promise.allSettled(promises)

    return { transactions, nextPageParams }
  }

  async getContract(_contractHash: string): Promise<TContractResponse> {
    throw new Error('Method not supported')
  }

  async getTokenInfo(tokenHash: string): Promise<TBSToken> {
    if (this.#service.tokenService.predicateByHash(tokenHash, BSStellarConstants.NATIVE_TOKEN.hash)) {
      return BSStellarConstants.NATIVE_TOKEN
    }

    const response = await this.#service._horizonServer.assets().forIssuer(tokenHash).limit(1).call()

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
    const account = await this.#service._horizonServer.loadAccount(address)

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
    const response = await this.#service._sorobanServer.getLatestLedger()
    return response.sequence
  }
}
