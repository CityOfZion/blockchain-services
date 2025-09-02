import { BSUtilsHelper } from './helpers/BSUtilsHelper'
import {
  Account,
  BlockchainService,
  BSCalculableFee,
  BSClaimable,
  BSWithEncryption,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  IBSWithNeo3NeoXBridge,
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

export function hasNeo3NeoXBridge<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & IBSWithNeo3NeoXBridge<BSName> {
  return 'neo3NeoXBridgeService' in service
}

export function hasEncryption<BSName extends string = string>(
  service: BlockchainService<BSName>
): service is BlockchainService<BSName> & BSWithEncryption<BSName> {
  return 'encrypt' in service && 'decrypt' in service
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
    await BSUtilsHelper.wait(waitMs)
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
    await BSUtilsHelper.wait(60000)

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
