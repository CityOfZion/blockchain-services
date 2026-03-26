import { TokenService } from '@cityofzion/blockchain-service'
import type { TBSSolanaName, TBSSolanaNetworkId } from '../../types'

export class TokenServiceSolana extends TokenService<TBSSolanaName, TBSSolanaNetworkId> {
  normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }
}
