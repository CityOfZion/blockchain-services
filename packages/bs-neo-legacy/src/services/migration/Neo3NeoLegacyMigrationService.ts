import { api, tx, u } from '@cityofzion/neon-js'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'
import {
  IBSNeoLegacy,
  TNeo3NeoLegacyMigrationNeo3Amounts,
  TNeo3NeoLegacyMigrationNeoLegacyAmounts,
  TNeo3NeoLegacyMigrateParams,
  TNeo3NeoLegacyWaitForMigrationParams,
} from '../../types'
import { BSNeoLegacyConstants } from '../../constants/BSNeoLegacyConstants'
import {
  TBalanceResponse,
  BSBigNumberHelper,
  BSUtilsHelper,
  TTransactionResponse,
} from '@cityofzion/blockchain-service'

export class Neo3NeoLegacyMigrationService<N extends string> {
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async migrate({ account, neo3Address, neoLegacyMigrationAmounts }: TNeo3NeoLegacyMigrateParams<N>): Promise<string> {
    if (!BSNeoLegacyHelper.isMainnetNetwork(this.#service.network)) {
      throw new Error('Must use Mainnet network')
    }

    if (
      (!neoLegacyMigrationAmounts.hasEnoughGasBalance && !neoLegacyMigrationAmounts.hasEnoughNeoBalance) ||
      (!neoLegacyMigrationAmounts.gasBalance && !neoLegacyMigrationAmounts.neoBalance)
    ) {
      throw new Error('Must have at least 0.1 GAS or 2 NEO')
    }

    const { neonJsAccount, signingCallback } = await this.#service.generateSigningCallback(account)
    const provider = new api.neoCli.instance(this.#service.network.url)
    const intents: ReturnType<typeof api.makeIntent> = []

    if (neoLegacyMigrationAmounts.hasEnoughGasBalance && neoLegacyMigrationAmounts.gasBalance)
      intents.push(
        ...api.makeIntent(
          { [BSNeoLegacyConstants.GAS_ASSET.symbol]: Number(neoLegacyMigrationAmounts.gasBalance.amount) },
          BSNeoLegacyConstants.MIGRATION_COZ_LEGACY_ADDRESS
        )
      )

    if (neoLegacyMigrationAmounts.hasEnoughNeoBalance && neoLegacyMigrationAmounts.neoBalance)
      intents.push(
        ...api.makeIntent(
          { [BSNeoLegacyConstants.NEO_ASSET.symbol]: Number(neoLegacyMigrationAmounts.neoBalance.amount) },
          BSNeoLegacyConstants.MIGRATION_COZ_LEGACY_ADDRESS
        )
      )

    return await this.#service.sendTransfer({
      url: this.#service.network.url,
      api: provider,
      account: neonJsAccount,
      intents,
      signingFunction: signingCallback,
      override: {
        attributes: [
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark14,
            data: u.str2hexstring(neo3Address),
          }),
          new tx.TransactionAttribute({
            usage: tx.TxAttrUsage.Remark15,
            data: u.str2hexstring('Neon Desktop Migration'),
          }),
        ],
      },
    })
  }

  /**
   * Reference: https://github.com/CityOfZion/legacy-n3-swap-service/blob/master/policy/policy.go
   */
  calculateNeo3MigrationAmounts(
    neoLegacyMigrationAmounts: TNeo3NeoLegacyMigrationNeoLegacyAmounts
  ): TNeo3NeoLegacyMigrationNeo3Amounts {
    const response: TNeo3NeoLegacyMigrationNeo3Amounts = {
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    }

    if (neoLegacyMigrationAmounts.gasBalance && neoLegacyMigrationAmounts.hasEnoughGasBalance) {
      // Two transfers fee and one transfer fee left over
      const allNep17TransfersFee = BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE * 3
      const gasMigrationAmountNumber = Number(neoLegacyMigrationAmounts.gasBalance.amount)

      // Necessary to calculate the COZ fee
      const gasAmountNumberLessAllNep17TransfersFee = gasMigrationAmountNumber - allNep17TransfersFee

      // Example: ~0.06635710 * 0.01 = ~0.00066357
      const cozFee = gasAmountNumberLessAllNep17TransfersFee * BSNeoLegacyConstants.MIGRATION_COZ_FEE

      // Example: ~0.06635710 - ~0.00066357 = ~0.06569352
      const gasAmountNumberLessCozFee = gasAmountNumberLessAllNep17TransfersFee - cozFee

      const allGasFeeNumberThatUserWillPay = cozFee + BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE * 2
      const allGasAmountNumberThatUserWillReceive =
        gasAmountNumberLessCozFee + BSNeoLegacyConstants.MIGRATION_NEP_17_TRANSFER_FEE

      response.gasMigrationTotalFees = BSBigNumberHelper.format(allGasFeeNumberThatUserWillPay, {
        decimals: BSNeoLegacyConstants.GAS_ASSET.decimals,
      })

      response.gasMigrationReceiveAmount = BSBigNumberHelper.format(allGasAmountNumberThatUserWillReceive, {
        decimals: BSNeoLegacyConstants.GAS_ASSET.decimals,
      })
    }

    if (neoLegacyMigrationAmounts.neoBalance && neoLegacyMigrationAmounts.hasEnoughNeoBalance) {
      const neoMigrationAmountNumber = Number(neoLegacyMigrationAmounts.neoBalance.amount)

      response.neoMigrationTotalFees = BSBigNumberHelper.format(
        Math.ceil(neoMigrationAmountNumber * BSNeoLegacyConstants.MIGRATION_COZ_FEE),
        { decimals: BSNeoLegacyConstants.NEO_ASSET.decimals }
      )

      response.neoMigrationReceiveAmount = BSBigNumberHelper.format(
        neoMigrationAmountNumber - Number(response.neoMigrationTotalFees),
        { decimals: BSNeoLegacyConstants.NEO_ASSET.decimals }
      )
    }

    return response
  }

  calculateNeoLegacyMigrationAmounts(balance: TBalanceResponse[]): TNeo3NeoLegacyMigrationNeoLegacyAmounts {
    const gasBalance = balance.find(({ token }) =>
      this.#service.tokenService.predicateByHash(BSNeoLegacyConstants.GAS_ASSET, token)
    )
    const neoBalance = balance.find(({ token }) =>
      this.#service.tokenService.predicateByHash(BSNeoLegacyConstants.NEO_ASSET, token)
    )

    let hasEnoughGasBalance = false
    let hasEnoughNeoBalance = false

    if (gasBalance) {
      const gasBalanceNumber = BSBigNumberHelper.fromNumber(gasBalance.amount)
      hasEnoughGasBalance = gasBalanceNumber.isGreaterThanOrEqualTo(BSNeoLegacyConstants.MIGRATION_MIN_GAS)
    }

    if (neoBalance) {
      const neoBalanceNumber = BSBigNumberHelper.fromNumber(neoBalance.amount)
      hasEnoughNeoBalance = neoBalanceNumber.isGreaterThanOrEqualTo(BSNeoLegacyConstants.MIGRATION_MIN_NEO)
    }

    return {
      gasBalance,
      neoBalance,
      hasEnoughGasBalance,
      hasEnoughNeoBalance,
    }
  }

  static async waitForMigration(params: TNeo3NeoLegacyWaitForMigrationParams) {
    const { neo3Address, neo3Service, transactionHash, neoLegacyService } = params

    const MAX_ATTEMPTS = 10
    const NEO3_MAX_ATTEMPTS = 20

    const response = {
      isTransactionConfirmed: false,
      isNeo3TransactionConfirmed: false,
    }

    let transactionResponse: TTransactionResponse

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await BSUtilsHelper.wait(30000)

      try {
        transactionResponse = await neoLegacyService.blockchainDataService.getTransaction(transactionHash)
        response.isTransactionConfirmed = true
        break
      } catch {
        // Empty block
      }
    }

    if (!response.isTransactionConfirmed) return response

    for (let i = 0; i < NEO3_MAX_ATTEMPTS; i++) {
      await BSUtilsHelper.wait(60000)

      try {
        const neo3Response = await neo3Service.blockchainDataService.getTransactionsByAddress({
          address: neo3Address,
        })

        const isTransactionConfirmed = neo3Response.transactions.some(
          transaction =>
            transaction.time > transactionResponse.time &&
            transaction.transfers.some(transfer => transfer.from === BSNeoLegacyConstants.MIGRATION_COZ_NEO3_ADDRESS)
        )

        if (isTransactionConfirmed) {
          response.isNeo3TransactionConfirmed = true
          break
        }
      } catch {
        // Empty block
      }
    }

    return response
  }
}
