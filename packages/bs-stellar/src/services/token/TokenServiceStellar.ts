import { TokenService } from '@cityofzion/blockchain-service'

export class TokenServiceStellar extends TokenService {
  normalizeHash(hash: string): string {
    return hash.toUpperCase()
  }
}
