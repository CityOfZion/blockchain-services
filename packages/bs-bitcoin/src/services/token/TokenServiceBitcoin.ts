import { TokenService } from '@cityofzion/blockchain-service'

export class TokenServiceBitcoin extends TokenService {
  normalizeHash(hash: string): string {
    return hash
  }
}
