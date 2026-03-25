import { TokenService } from '@cityofzion/blockchain-service'
import type { TBSNeo3Name, TBSNeo3NetworkId } from '../../types'

export class TokenServiceNeo3 extends TokenService<TBSNeo3Name, TBSNeo3NetworkId> {
  normalizeHash(hash: string): string {
    const fixed = hash.startsWith('0x') ? hash : `0x${hash}`
    return fixed.toLowerCase()
  }
}
