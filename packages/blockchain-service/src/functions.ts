import { BSUtilsHelper } from './helpers/BSUtilsHelper'
import type {
  TBSAccount,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNeo3NeoXBridge,
  IBSWithNft,
  TUntilIndexRecord,
  IBSWithWalletConnect,
  IBSWithFullTransactions,
} from './interfaces'

export function hasNameService<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithNameService {
  return 'resolveNameServiceDomain' in service && 'validateNameServiceDomainFormat' in service
}

export function isClaimable<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithClaim<N> {
  return 'claim' in service && 'claimToken' in service && 'claimDataService' in service
}

export function isCalculableFee<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithFee<N> {
  return 'calculateTransferFee' in service
}

export function hasNft<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithNft {
  return 'nftDataService' in service
}

export function hasExplorerService<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithExplorer {
  return 'explorerService' in service
}

export function hasLedger<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithLedger<N> {
  return 'ledgerService' in service
}

export function hasNeo3NeoXBridge<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithNeo3NeoXBridge<N> {
  return 'neo3NeoXBridgeService' in service
}

export function hasEncryption<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithEncryption<N> {
  return 'encrypt' in service && 'decrypt' in service
}

export function hasWalletConnect<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithWalletConnect<N> {
  return 'walletConnectService' in service
}

export function hasFullTransactions<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>
): service is IBlockchainService<N, A> & IBSWithFullTransactions<N> {
  return 'fullTransactionsDataService' in service
}

/**
 * @deprecated use `waitForAccountTransaction` instead
 */
export async function waitForTransaction<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>,
  txId: string
): Promise<boolean> {
  const maxAttempts = 30
  const waitMs = service.blockchainDataService.maxTimeToConfirmTransactionInMs / maxAttempts

  let attempts = 0
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

export async function waitForAccountTransaction<N extends string = string, A extends string = string>(params: {
  service: IBlockchainService<N, A>
  txId: string
  address: string
  maxAttempts?: number
}): Promise<boolean> {
  const { address, maxAttempts = 10, service, txId } = params
  let attempts = 0

  do {
    await BSUtilsHelper.wait(60000)

    try {
      const response = await service.blockchainDataService.getTransactionsByAddress({ address })
      const isTransactionConfirmed = response.transactions.some(transaction => transaction.txId === txId)

      if (isTransactionConfirmed) return true
    } catch {
      // Empty block
    }

    attempts++
  } while (attempts < maxAttempts)

  return false
}

export async function fetchAccounts<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>,
  initialIndex: number,
  getAccountCallback: (service: IBlockchainService<N, A>, index: number) => Promise<TBSAccount<N>>
): Promise<TBSAccount<N>[]> {
  const accounts: TBSAccount<N>[] = []

  let index = initialIndex
  let shouldBreak = false

  while (!shouldBreak) {
    const generatedAccount = await getAccountCallback(service, index)

    try {
      const { transactions } = await service.blockchainDataService.getTransactionsByAddress({
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

export async function generateAccount<N extends string = string, A extends string = string>(
  service: IBlockchainService<N, A>,
  initialIndex: number,
  untilIndex: number,
  getAccountCallback: (service: IBlockchainService<N, A>, index: number) => Promise<TBSAccount<N>>
): Promise<TBSAccount<N>[]> {
  const accounts: TBSAccount<N>[] = []

  let index = initialIndex

  while (index <= untilIndex) {
    const generatedAccount = await getAccountCallback(service, index)
    accounts.push(generatedAccount)
    index++
  }

  return accounts
}

export async function generateAccountForBlockchainService<N extends string = string, A extends string = string>(
  services: IBlockchainService<N, A>[],
  getAccountCallback: (service: IBlockchainService<N, A>, index: number) => Promise<TBSAccount<N>>,
  untilIndexByBlockchainService?: TUntilIndexRecord<N>
): Promise<Map<N, TBSAccount<N>[]>> {
  const accountsByBlockchainService = new Map<N, TBSAccount<N>[]>()

  const promises = services.map(async service => {
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
