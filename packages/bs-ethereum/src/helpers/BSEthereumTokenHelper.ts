import { BSTokenHelper } from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'

export class BSEthereumTokenHelper extends BSTokenHelper {
  static normalizeHash(hash: string): string {
    let fixedHash = BSTokenHelper.normalizeHash(hash)
    try {
      fixedHash = ethers.utils.getAddress(fixedHash) // Normalize to checksum address
    } catch {
      /* empty */
    }
    return fixedHash
  }
}
