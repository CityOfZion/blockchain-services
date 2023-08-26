import { BlockchainService, BSCalculableFee, BSClaimable, BSWithNameService, BSWithNft } from './interfaces'

export function hasNameService(service: BlockchainService): service is BSWithNameService & BlockchainService {
  return 'getNNSRecord' in service && 'getOwnerOfNNS' in service && 'validateNNSFormat' in service
}

export function isClaimable(service: BlockchainService): service is BSClaimable & BlockchainService {
  return 'claim' in service && 'claimToken' in service && 'getUnclaimed' in service.blockchainDataService
}

export function isCalculableFee(service: BlockchainService): service is BSCalculableFee & BlockchainService {
  return 'calculateTransferFee' in service
}

export function hasNft(service: BlockchainService): service is BSWithNft & BlockchainService {
  return 'nftDataService' in service
}
