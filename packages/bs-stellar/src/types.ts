import {
  IBlockchainService,
  IBSWithFee,
  TBSNetworkId,
  type IBSWithExplorer,
  type IBSWithLedger,
  type IBSWithWalletConnect,
  type TBSAccount,
  type TBSBigNumber,
  type TBSToken,
} from '@cityofzion/blockchain-service'
import type { Horizon, rpc, Transaction } from '@stellar/stellar-sdk'

export type TBSStellarNetworkId = TBSNetworkId<'pubnet' | 'testnet'>

export interface IBSStellar<N extends string = string>
  extends IBlockchainService<N, TBSStellarNetworkId>,
    IBSWithFee<N>,
    IBSWithExplorer,
    IBSWithLedger<N>,
    IBSWithWalletConnect {
  sorobanServer: rpc.Server
  horizonServer: Horizon.Server

  signTransaction(transaction: Transaction, senderAccount: TBSAccount<N>): Promise<Transaction>
  getFeeEstimate(length: number): Promise<TBSBigNumber>
  createTrustline(senderAccount: TBSAccount<N>, token: TBSToken): Promise<string>
}
