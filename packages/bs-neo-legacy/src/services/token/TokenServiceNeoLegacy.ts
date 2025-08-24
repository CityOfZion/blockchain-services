import { TokenService } from '@cityofzion/blockchain-service'

export class TokenServiceNeoLegacy extends TokenService {
  normalizeHash(hash: string): string {
    const fixed = hash.startsWith('0x') ? hash : `0x${hash}`
    return fixed.toLowerCase()
  }
}
