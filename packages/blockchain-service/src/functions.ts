import {
  Account,
  BlockchainService,
  BSCalculableFee,
  BSClaimable,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
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

function wait(ms: number) {
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

export async function waitForAccountTransaction<BSName extends string = string>(
  service: BlockchainService<BSName>,
  txId: string,
  account: Account<BSName>,
  maxAttempts = 10
): Promise<boolean> {
  let attempts = 1

  do {
    await wait(60000)

    try {
      const response = await service.blockchainDataService.getTransactionsByAddress({ address: account.address })
      const isTransactionConfirmed = response.transactions.some(transaction => transaction.hash === txId)

      if (isTransactionConfirmed) return true
    } catch {
      // Empty block
    }

    attempts++
  } while (attempts < maxAttempts)

  return false
}

export async function fetchAccountsForBlockchainServices<BSName extends string = string>(
  blockchainServices: BlockchainService<BSName>[],
  getAccountCallback: (service: BlockchainService<BSName>, index: number) => Promise<Account<BSName>>
): Promise<Map<BSName, Account<BSName>[]>> {
  const accountsByBlockchainService = new Map<BSName, Account<BSName>[]>()

  const promises = blockchainServices.map(async service => {
    let index = 0
    const accounts: Account<BSName>[] = []
    let shouldBreak = false

    while (!shouldBreak) {
      const generatedAccount = await getAccountCallback(service, index)

      if (index !== 0) {
        try {
          const { transactions } = await service.blockchainDataService.getTransactionsByAddress({
            address: generatedAccount.address,
          })

          if (!transactions || transactions.length <= 0) shouldBreak = true
        } catch {
          shouldBreak = true
        }
      }

      accounts.push(generatedAccount)
      index++
    }

    accountsByBlockchainService.set(service.name, accounts)
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
