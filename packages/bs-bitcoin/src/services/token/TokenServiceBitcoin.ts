import { TokenService } from '@cityofzion/blockchain-service'
import type { TBSBitcoinName, TBSBitcoinNetworkId } from '../../types'

export class TokenServiceBitcoin extends TokenService<TBSBitcoinName, TBSBitcoinNetworkId> {
  normalizeHash(hash: string): string {
    return hash
  }
}
