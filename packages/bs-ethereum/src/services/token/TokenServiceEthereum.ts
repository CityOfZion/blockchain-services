import { TokenService } from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'

export class TokenServiceEthereum extends TokenService {
  normalizeHash(hash: string): string {
    let fixedHash = hash.startsWith('0x') ? hash : `0x${hash}`

    try {
      fixedHash = ethers.utils.getAddress(fixedHash) // Normalize to checksum address
    } catch {
      /* empty */
    }

    return fixedHash
  }
}
