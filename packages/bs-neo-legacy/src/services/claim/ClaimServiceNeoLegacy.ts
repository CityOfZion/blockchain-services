import {
  BSError,
  type IClaimService,
  type TBSAccount,
  type TBSToken,
  type TClaimServiceTransactionData,
  type TTransaction,
  type TTransactionDefault,
} from '@cityofzion/blockchain-service'
import type { TBSNeoLegacyName } from '../../types'
import { api } from '@cityofzion/dora-ts'
import { BSNeoLegacyConstants } from '../../constants/BSNeoLegacyConstants'

export class ClaimServiceNeoLegacy implements IClaimService<TBSNeoLegacyName> {
  readonly claimToken: TBSToken

  constructor() {
    this.claimToken = BSNeoLegacyConstants.GAS_ASSET
  }

  getTransactionData(transaction: TTransaction): TClaimServiceTransactionData | undefined {
    return transaction.data?.type === 'claim' ? transaction.data : undefined
  }

  async getUnclaimed(address: string): Promise<string> {
    const response = await api.NeoLegacyREST.getUnclaimed(address)

    return (response?.unclaimed ?? 0).toFixed(this.claimToken.decimals)
  }

  async calculateFee(_account: TBSAccount<TBSNeoLegacyName>): Promise<string> {
    throw new BSError('Method not supported', 'METHOD_NOT_SUPPORTED')
  }

  async claim(_account: TBSAccount<TBSNeoLegacyName>): Promise<TTransactionDefault> {
    throw new BSError('Method not supported', 'METHOD_NOT_SUPPORTED')
  }
}
