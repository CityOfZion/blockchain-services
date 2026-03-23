import type { IClaimDataService } from '@cityofzion/blockchain-service'
import type { IBSNeoLegacy } from '../../types'
import { api } from '@cityofzion/dora-ts'

export class DoraCDSNeoLegacy implements IClaimDataService {
  readonly #service: IBSNeoLegacy

  constructor(service: IBSNeoLegacy) {
    this.#service = service
  }

  async getUnclaimed(address: string): Promise<string> {
    const response = await api.NeoLegacyREST.getUnclaimed(address)

    return (response?.unclaimed ?? 0).toFixed(this.#service.claimToken.decimals)
  }
}
