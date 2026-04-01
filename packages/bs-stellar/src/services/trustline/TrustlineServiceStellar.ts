import * as stellarSDK from '@stellar/stellar-sdk'
import type {
  IBSStellar,
  TBSStellarName,
  TTrustlineServiceStellarChangeTrustlineParams,
  TTrustlineServiceStellarGetTrustlinesResponse,
  TTrustlineServiceStellarHasTrustlineParams,
  TTTrustlineServiceStellarGetAllTokensParams,
} from '../../types'
import {
  BSBigHumanAmount,
  BSBigUnitAmount,
  BSError,
  type TBSToken,
  type TTransactionDefault,
} from '@cityofzion/blockchain-service'
import { BSStellarConstants } from '../../constants/BSStellarConstants'

export class TrustlineServiceStellar {
  #service: IBSStellar

  constructor(service: IBSStellar) {
    this.#service = service
  }

  async hasTrustline({ address, token }: TTrustlineServiceStellarHasTrustlineParams): Promise<boolean> {
    const account = await this.#service._horizonServer.loadAccount(address)

    const asset = new stellarSDK.Asset(token.symbol, token.hash)
    const assetCode = asset.getCode()
    const assetIssuer = asset.getIssuer()

    const hasTrustline = account.balances.some(
      balance =>
        (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === assetIssuer
    )

    return hasTrustline
  }

  async changeTrustline({
    senderAccount,
    token,
    limit,
  }: TTrustlineServiceStellarChangeTrustlineParams): Promise<TTransactionDefault<TBSStellarName>> {
    const asset = new stellarSDK.Asset(token.symbol, token.hash)

    const sourceAccount = await this.#service._ensureAccountOnChain(senderAccount.address)

    const fee = await this.#service._getFeeEstimate(1)

    const formattedLimit = limit ? new BSBigHumanAmount(limit, token.decimals).toFormatted() : undefined

    const builtTransaction = new stellarSDK.TransactionBuilder(sourceAccount, {
      fee: fee.toString(),
      networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[this.#service.network.id],
    })
      .addOperation(stellarSDK.Operation.changeTrust({ asset, limit: formattedLimit }))
      .setTimeout(30)
      .build()

    const signedTransaction = await this.#service._signTransaction(builtTransaction, senderAccount)

    const response = await this.#service._sorobanServer.sendTransaction(signedTransaction)

    if (BSStellarConstants.INVALID_TRANSACTION_STATUS.includes(response.status)) {
      throw new BSError(`Transaction failed: ${response.errorResult?.result}`, 'TRANSACTION_FAILED')
    }

    const txId = response.hash

    return {
      blockchain: this.#service.name,
      isPending: true,
      relatedAddress: senderAccount.address,
      txId,
      txIdUrl: this.#service.explorerService.buildTransactionUrl(txId),
      date: new Date().toJSON(),
      view: 'default',
      networkFeeAmount: new BSBigUnitAmount(signedTransaction.fee, this.#service.feeToken.decimals)
        .toHuman()
        .toFormatted(),
      events: [
        {
          eventType: 'generic',
          from: senderAccount.address,
          fromUrl: this.#service.explorerService.buildAddressUrl(senderAccount.address),
          methodName: stellarSDK.Horizon.HorizonApi.OperationResponseType.changeTrust,
          data: {
            limit,
            token: token.symbol,
          },
        },
      ],
    }
  }

  async getTrustlines(address: string) {
    const balances = await this.#service.blockchainDataService.getBalance(address)
    const trustlines: TTrustlineServiceStellarGetTrustlinesResponse[] = []

    for (const balance of balances) {
      if (balance.token.hash === this.#service.feeToken.hash) continue
      trustlines.push({ token: balance.token, limit: balance.amount })
    }

    return trustlines
  }

  async getAllTokens(params: TTTrustlineServiceStellarGetAllTokensParams): Promise<TBSToken[]> {
    const callBuilder = this.#service._horizonServer.assets().limit(100).forCode(params.code.toUpperCase())

    const assets = await callBuilder.call()

    return assets.records
      .sort((a, b) => b.accounts.authorized - a.accounts.authorized)
      .map<TBSToken>(token => ({
        symbol: token.asset_code,
        hash: token.asset_issuer,
        decimals: BSStellarConstants.SAC_TOKEN_DECIMALS,
        name: token.asset_code,
      }))
  }
}
