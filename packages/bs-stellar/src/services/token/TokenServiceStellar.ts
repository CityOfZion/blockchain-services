import { TokenService } from '@cityofzion/blockchain-service'
import type { TBSStellarName, TBSStellarNetworkId } from '../../types'
import { StrKey } from '@stellar/stellar-sdk'

export class TokenServiceStellar extends TokenService<TBSStellarName, TBSStellarNetworkId> {
  normalizeHash(hash: string): string {
    return hash.toUpperCase()
  }

  validateTokenHash(hash?: string): hash is string {
    hash = hash?.trim()

    if (!hash?.length) return false

    return StrKey.isValidEd25519PublicKey(hash)
  }
}
