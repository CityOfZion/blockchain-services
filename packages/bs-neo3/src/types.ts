import type {
  TBSAccount,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNeo3NeoXBridge,
  IBSWithNft,
  TBSNetworkId,
  IBSWithWalletConnect,
  IBSWithFullTransactions,
  TTransactionDefault,
  TTransferParams,
  TTransaction,
} from '@cityofzion/blockchain-service'
import { wallet, api } from './helpers/BSNeo3NeonJsSingletonHelper'
import type { Neo3NeoXBridgeService } from './services/neo3-neox-bridge/Neo3NeoXBridgeService'
import type { ClaimServiceNeo3 } from './services/claim/ClaimServiceNeo3'
import type { VoteServiceNeo3 } from './services/vote/VoteServiceNeo3'

export type TBSNeo3NetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export type TBSNeo3Name = 'neo3'
export interface IBSNeo3
  extends
    IBlockchainService<TBSNeo3Name, TBSNeo3NetworkId>,
    IBSWithNameService,
    IBSWithClaim<TBSNeo3Name>,
    IBSWithFee<TBSNeo3Name>,
    IBSWithNft,
    IBSWithExplorer,
    IBSWithLedger<TBSNeo3Name>,
    IBSWithNeo3NeoXBridge<TBSNeo3Name>,
    IBSWithEncryption<TBSNeo3Name>,
    IBSWithWalletConnect<TBSNeo3Name>,
    IBSWithFullTransactions {
  neo3NeoXBridgeService: Neo3NeoXBridgeService
  claimService: ClaimServiceNeo3
  voteService: VoteServiceNeo3

  transfer(params: TTransferParams<TBSNeo3Name>): Promise<TTransactionDefault[]>

  _generateSigningCallback(account: TBSAccount<TBSNeo3Name>): Promise<{
    neonJsAccount: wallet.Account
    signingCallback: api.SigningFunction
  }>
}

export type TVoteServiceCandidate = {
  position: number
  name: string
  description: string
  location: string
  email: string
  website: string
  hash: string
  pubKey: string
  votes: number
  logoUrl?: string
  type: 'consensus' | 'council'
}

export type TVoteServiceDetailsByAddressResponse = {
  candidateName?: string
  candidatePubKey?: string
  neoBalance: number
  address: string
}

export type TVoteServiceVoteParams = {
  account: TBSAccount<TBSNeo3Name>
  candidatePubKey: string
}

export type TDoraVoteServiceNeo3GetVoteCIMParams = {
  address: string
  candidatePubKey: string
}

export type TDoraVoteServiceNeo3GetCommitteeApiResponse = {
  scripthash: string
  name: string
  description: string
  location: string
  website: string
  email: string
  github: string
  telegram: string
  twitter: string
  logo: string
  votes: number
  pubkey: string
}

export type TDoraVoteServiceNeo3GetVoteDetailsByAddressApiResponse = {
  vote: string
  candidate: string
  candidatePubkey: string
  balance: number
}

export type TVoteServiceNeo3TransactionData = {
  isVote: true
}

export interface IVoteService {
  getCandidatesToVote(): Promise<TVoteServiceCandidate[]>
  getVoteDetailsByAddress(address: string): Promise<TVoteServiceDetailsByAddressResponse>
  vote(params: TVoteServiceVoteParams): Promise<TTransactionDefault>
  calculateVoteFee(params: TVoteServiceVoteParams): Promise<string>
  getTransactionData(transaction: TTransaction): TVoteServiceNeo3TransactionData | undefined
}

export type TRpcVoteServiceNeo3GetVoteCIMParams = {
  address: string
  candidatePubKey: string
}

export type TNeo3NeoXBridgeServiceGetBridgeTxByNonceApiResponse = { result: { Vmstate: string; txid: string } }

export enum ENeonDappKitLedgerServiceNeo3Status {
  OK = 0x9000,
}

export enum ENeonDappKitLedgerServiceNeo3Command {
  GET_APP_NAME = 0x00,
  GET_PUBLIC_KEY = 0x04,
  SIGN = 0x02,
}

export enum ENeonDappKitLedgerServiceNeo3SecondParameter {
  MORE_DATA = 0x80,
  LAST_DATA = 0x00,
}

export type TRpcBDSNeo3NotificationState = {
  type: string
  value?: any | undefined
}

export type TRpcBDSNeo3Notification = {
  contract: string
  eventname: string
  state: TRpcBDSNeo3NotificationState | TRpcBDSNeo3NotificationState[] | undefined
}

export type TWalletConnectServiceNeo3Method =
  | 'invokeFunction'
  | 'testInvoke'
  | 'signMessage'
  | 'verifyMessage'
  | 'getWalletInfo'
  | 'traverseIterator'
  | 'getNetworkVersion'
  | 'encrypt'
  | 'decrypt'
  | 'decryptFromArray'
  | 'calculateFee'
  | 'signTransaction'
