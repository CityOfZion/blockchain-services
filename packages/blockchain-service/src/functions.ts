import { BlockchainService, CalculableFee, Claimable, NeoNameService } from './interfaces'

export function hasNNS(service: BlockchainService): service is NeoNameService & BlockchainService {
  return 'getNNSRecord' in service && 'getOwnerOfNNS' in service && 'validateNNSFormat' in service
}

export function isClaimable(service: BlockchainService): service is Claimable & BlockchainService {
  return 'claim' in service && 'tokenClaim' in service && 'getUnclaimed' in service.dataService
}

export function isCalculableFee(service: BlockchainService): service is CalculableFee & BlockchainService {
  return 'calculateTransferFee' in service
}
