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

export type TBSStellarName = 'stellar'

export interface IBSStellar
  extends
    IBlockchainService<TBSStellarName, TBSStellarNetworkId>,
    IBSWithFee<TBSStellarName>,
    IBSWithExplorer,
    IBSWithLedger<TBSStellarName>,
    IBSWithWalletConnect<TBSStellarName> {
  sorobanServer: rpc.Server
  horizonServer: Horizon.Server

  signTransaction(transaction: Transaction, senderAccount: TBSAccount<TBSStellarName>): Promise<Transaction>
  getFeeEstimate(length: number): Promise<TBSBigNumber>
  createTrustline(senderAccount: TBSAccount<TBSStellarName>, token: TBSToken): Promise<string>
}
