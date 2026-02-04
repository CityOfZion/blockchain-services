import type {
  IBlockchainService,
  IBSWithFee,
  TBSNetworkId,
  IBSWithExplorer,
  IBSWithLedger,
  IBSWithWalletConnect,
  TBSAccount,
  TBSBigNumber,
  TBSToken,
} from '@cityofzion/blockchain-service'
import type { Horizon, rpc, Transaction } from '@stellar/stellar-sdk'

export type TBSStellarNetworkId = TBSNetworkId<'pubnet' | 'testnet'>

export interface IBSStellar<N extends string = string, A extends string = TBSStellarNetworkId>
  extends IBlockchainService<N, A>,
    IBSWithFee<N>,
    IBSWithExplorer,
    IBSWithLedger<N>,
    IBSWithWalletConnect<N> {
  sorobanServer: rpc.Server
  horizonServer: Horizon.Server

  signTransaction(transaction: Transaction, senderAccount: TBSAccount<N>): Promise<Transaction>
  getFeeEstimate(length: number): Promise<TBSBigNumber>
  createTrustline(senderAccount: TBSAccount<N>, token: TBSToken): Promise<string>
}
