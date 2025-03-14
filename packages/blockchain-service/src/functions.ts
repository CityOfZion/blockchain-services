import { BlockchainServiceConstants } from './constants'
import {
  Account,
  BlockchainService,
  BSCalculableFee,
  BSClaimable,
  BSMigrationNeo3,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  TransactionResponse,
  UntilIndexRecord,
} from './interfaces'

export function hasNameService<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSWithNameService {
  return 'resolveNameServiceDomain' in service && 'validateNameServiceDomainFormat' in service
}

export function isClaimable<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSClaimable<BSName> {
  return 'claim' in service && 'claimToken' in service && 'getUnclaimed' in service.blockchainDataService
}

export function hasMigrationNeo3<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSMigrationNeo3<BSName> {
  return 'migrateToNeo3' in service && 'calculateToMigrateToNeo3Values' in service
}

export function isCalculableFee<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSCalculableFee<BSName> {
  return 'calculateTransferFee' in service
}

export function hasNft<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSWithNft {
  return 'nftDataService' in service
}

export function hasExplorerService<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSWithExplorerService {
  return 'explorerService' in service
}

export function hasLedger<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSWithLedger<BSName> {
  return 'ledgerService' in service
}

export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * @deprecated use `waitForAccountTransaction` instead
 */
export async function waitForTransaction<BSName extends string = string>(
  service: BlockchainService<BSName>,
  txId: string
): Promise<boolean> {
  const maxAttempts = 30
  const waitMs = service.blockchainDataService.maxTimeToConfirmTransactionInMs / maxAttempts

  let attempts = 1
  do {
    try {
      await service.blockchainDataService.getTransaction(txId)
      return true
    } catch {
      // Empty block
    }

    attempts++
    await wait(waitMs)
  } while (attempts < maxAttempts)

  return false
}

export async function waitForAccountTransaction<BSName extends string = string>(params: {
  service: BlockchainService<BSName>
  txId: string
  address: string
  maxAttempts?: number
}): Promise<boolean> {
  const { address, maxAttempts = 10, service, txId } = params
  let attempts = 1

  do {
    await wait(60000)

    try {
      const response = await service.blockchainDataService.getTransactionsByAddress({ address })
      const isTransactionConfirmed = response.transactions.some(transaction => transaction.hash === txId)

      if (isTransactionConfirmed) return true
    } catch {
      // Empty block
    }

    attempts++
  } while (attempts < maxAttempts)

  return false
}

export async function waitForMigration(params: {
  service: BlockchainService & BSMigrationNeo3
  neo3Service: BlockchainService
  neo3Address: string
  txId: string
}) {
  const { neo3Address, neo3Service, service, txId } = params
  const MAX_ATTEMPTS = 10
  const NEO3_MAX_ATTEMPTS = 20

  const response = {
    isTransactionConfirmed: false,
    isNeo3TransactionConfirmed: false,
  }

  let transactionResponse: TransactionResponse

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await wait(30000)

    try {
      transactionResponse = await service.blockchainDataService.getTransaction(txId)
      response.isTransactionConfirmed = true
      break
    } catch {
      // Empty block
    }
  }

  if (!response.isTransactionConfirmed) return response

  for (let i = 0; i < NEO3_MAX_ATTEMPTS; i++) {
    await wait(60000)

    try {
      const neo3Response = await neo3Service.blockchainDataService.getTransactionsByAddress({
        address: neo3Address,
      })

      const isTransactionConfirmed = neo3Response.transactions.some(
        transaction =>
          transaction.time > transactionResponse.time &&
          transaction.transfers.some(
            transfer => transfer.from === BlockchainServiceConstants.COZ_NEO3_MIGRATION_ADDRESS
          )
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

export async function fetchAccounts<BSName extends string = string>(
  blockchainServices: BlockchainService<BSName>,
  initialIndex: number,
  getAccountCallback: (service: BlockchainService<BSName>, index: number) => Promise<Account<BSName>>
): Promise<Account<BSName>[]> {
  const accounts: Account<BSName>[] = []

  let index = initialIndex
  let shouldBreak = false

  while (!shouldBreak) {
    const generatedAccount = await getAccountCallback(blockchainServices, index)

    try {
      const { transactions } = await blockchainServices.blockchainDataService.getTransactionsByAddress({
        address: generatedAccount.address,
      })

      if (!transactions || transactions.length <= 0) shouldBreak = true
    } catch {
      shouldBreak = true
    }

    accounts.push(generatedAccount)
    index++
  }

  return accounts
}

export async function generateAccount<BSName extends string = string>(
  blockchainServices: BlockchainService<BSName>,
  initialIndex: number,
  untilIndex: number,
  getAccountCallback: (service: BlockchainService<BSName>, index: number) => Promise<Account<BSName>>
): Promise<Account<BSName>[]> {
  const accounts: Account<BSName>[] = []

  let index = initialIndex

  while (index <= untilIndex) {
    const generatedAccount = await getAccountCallback(blockchainServices, index)
    accounts.push(generatedAccount)
    index++
  }

  return accounts
}

export async function generateAccountForBlockchainService<BSName extends string = string>(
  blockchainServices: BlockchainService<BSName>[],
  getAccountCallback: (service: BlockchainService<BSName>, index: number) => Promise<Account<BSName>>,
  untilIndexByBlockchainService?: UntilIndexRecord<BSName>
): Promise<Map<BSName, Account<BSName>[]>> {
  const accountsByBlockchainService = new Map<BSName, Account<BSName>[]>()

  const promises = blockchainServices.map(async service => {
    const firstAccount = await getAccountCallback(service, 0)
    const untilIndex = untilIndexByBlockchainService?.[service.name]?.[firstAccount.address]

    if (untilIndex === undefined) {
      const accounts = await fetchAccounts(service, 1, getAccountCallback)
      accountsByBlockchainService.set(service.name, [firstAccount, ...accounts])
    } else {
      const accounts = await generateAccount(service, 1, untilIndex, getAccountCallback)
      accountsByBlockchainService.set(service.name, [firstAccount, ...accounts])
    }
  })

  await Promise.all(promises)

  return accountsByBlockchainService
}

export function normalizeHash(hash: string): string {
  return hash.replace('0x', '').toLowerCase()
}

export function denormalizeHash(hash: string): string {
  return hash.startsWith('0x') ? hash : `0x${hash}`
}

export function countDecimals(value: string | number) {
  const [, decimals] = value.toString().split('.')
  return decimals?.length ?? 0
}

export function formatNumber(value: string | number, decimals: number = 0) {
  let newValue = typeof value === 'number' ? value.toFixed(decimals) : value

  newValue = newValue.replace(/,|\.\.|\.,/g, '.')

  if (decimals === 0) {
    newValue = newValue.split('.')[0]
  } else {
    newValue = newValue.replace(/[^\d.]/g, '')
    const countedDecimals = countDecimals(newValue)

    if (countedDecimals > decimals) {
      newValue = newValue.slice(0, newValue.length - countedDecimals + decimals)
    }
  }

  return newValue.replace(/\s|-/g, '').replace(/^([^.]*\.)(.*)$/, function (_a, b, c) {
    return b + c.replace(/\./g, '')
  })
}
