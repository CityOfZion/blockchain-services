import {
  BlockchainService,
  BSCalculableFee,
  BSClaimable,
  BSWithExplorerService,
  BSWithLedger,
  BSWithNameService,
  BSWithNft,
  BSWithSwap,
} from './interfaces'

export function hasNameService(service: BlockchainService): service is BlockchainService & BSWithNameService {
  return 'resolveNameServiceDomain' in service && 'validateNameServiceDomainFormat' in service
}

export function isClaimable(service: BlockchainService): service is BlockchainService & BSClaimable {
  return 'claim' in service && 'claimToken' in service && 'getUnclaimed' in service.blockchainDataService
}

export function isCalculableFee(service: BlockchainService): service is BlockchainService & BSCalculableFee {
  return 'calculateTransferFee' in service
}

export function hasNft(service: BlockchainService): service is BlockchainService & BSWithNft {
  return 'nftDataService' in service
}

export function hasExplorerService(service: BlockchainService): service is BlockchainService & BSWithExplorerService {
  return 'explorerService' in service
}

export function hasLedger(service: BlockchainService): service is BlockchainService & BSWithLedger {
  return 'ledgerService' in service
}

export function hasSwap(service: BlockchainService): service is BlockchainService & BSWithSwap {
  return 'createSwapService' in service
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitForTransaction(service: BlockchainService, txId: string): Promise<boolean> {
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
