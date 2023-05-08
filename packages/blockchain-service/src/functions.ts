import { BlockchainService, Claimable, NeoNameService } from "./interfaces"

export function hasNNS(service: BlockchainService): service is NeoNameService & BlockchainService {
  return "getNeoNsRecord" in service  && "getOwnerOfNeoNsRecord" in service && "validateNNSDomain" in service
}

export function isClaimable(service: BlockchainService): service is Claimable & BlockchainService {
  return "claim" in this && "tokenClaim" in this && "getUnclaimed" in this.dataService
}