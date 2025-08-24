import {
  Account,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNeo3NeoXBridge,
  IBSWithNft,
  TNetworkId,
} from '@cityofzion/blockchain-service'
import { wallet } from '@cityofzion/neon-core'
import { api } from '@cityofzion/neon-js'

export type TBSNeo3NetworkId = TNetworkId<'mainnet' | 'testnet'>

export interface IBSNeo3<N extends string = string>
  extends IBlockchainService<N, TBSNeo3NetworkId>,
    IBSWithClaim<N>,
    IBSWithNameService,
    IBSWithFee<N>,
    IBSWithNft,
    IBSWithExplorer,
    IBSWithLedger<N>,
    IBSWithNeo3NeoXBridge<N>,
    IBSWithEncryption<N> {
  generateSigningCallback(account: Account<N>): Promise<{
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

export type TVoteServiceVoteParams<BSName extends string> = {
  account: Account<BSName>
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

export interface IVoteService<BSName extends string> {
  getCandidatesToVote(): Promise<TVoteServiceCandidate[]>
  getVoteDetailsByAddress(address: string): Promise<TVoteServiceDetailsByAddressResponse>
  vote(params: TVoteServiceVoteParams<BSName>): Promise<string>
  calculateVoteFee(params: TVoteServiceVoteParams<BSName>): Promise<string>
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
