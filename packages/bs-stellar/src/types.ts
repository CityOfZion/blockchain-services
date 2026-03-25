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
  IBSWithFaucet,
} from '@cityofzion/blockchain-service'
import type { Horizon, rpc, Transaction } from '@stellar/stellar-sdk'
import * as stellarSDK from '@stellar/stellar-sdk'
import type { TrustlineServiceStellar } from './services/trustline/TrustlineServiceStellar'

export type TBSStellarNetworkId = TBSNetworkId<'pubnet' | 'testnet'>

export type TBSStellarName = 'stellar'

export interface IBSStellar
  extends
    IBlockchainService<TBSStellarName, TBSStellarNetworkId>,
    IBSWithFee<TBSStellarName>,
    IBSWithExplorer,
    IBSWithLedger<TBSStellarName>,
    IBSWithWalletConnect<TBSStellarName>,
    IBSWithFaucet {
  trustlineService: TrustlineServiceStellar

  _sorobanServer: rpc.Server
  _horizonServer: Horizon.Server

  _signTransaction(transaction: Transaction, senderAccount: TBSAccount<TBSStellarName>): Promise<Transaction>
  _getFeeEstimate(length: number): Promise<TBSBigNumber>
  _ensureAccountOnChain(address: string): Promise<stellarSDK.Account>
}

export type TTrustlineServiceStellarChangeTrustlineParams = {
  senderAccount: TBSAccount<TBSStellarName>
  token: TBSToken
  limit?: string
}

export type TTrustlineServiceStellarHasTrustlineParams = {
  address: string
  token: TBSToken
}

export type TTrustlineServiceStellarGetTrustlinesResponse = {
  token: TBSToken
  limit: string
}

export type TTTrustlineServiceStellarGetAllTokensParams = {
  code: string
}

export type TBSStellarFriendBotResponse = {
  successful: boolean
  hash: string
  envelope_xdr: string
}
