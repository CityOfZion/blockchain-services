import { TokenService } from '@cityofzion/blockchain-service'

export class TokenServiceSolana extends TokenService {
  normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
