import { BlockchainService, BSCalculableFee, BSClaimable, BSWithNameService, BSWithNft } from './interfaces'

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
