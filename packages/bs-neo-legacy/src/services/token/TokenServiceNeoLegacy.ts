import { TokenService } from '@cityofzion/blockchain-service'
import type { TBSNeoLegacyName, TBSNeoLegacyNetworkId } from '../../types'

export class TokenServiceNeoLegacy extends TokenService<TBSNeoLegacyName, TBSNeoLegacyNetworkId> {
  normalizeHash(hash: string): string {
    const fixed = hash.startsWith('0x') ? hash : `0x${hash}`
    return fixed.toLowerCase()
  }
}
