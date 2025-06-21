import { Account } from '@cityofzion/blockchain-service'
import Neon from '@cityofzion/neon-core'
import { api } from '@cityofzion/neon-js'

export type GenerateSigningCallbackResponse = {
  neonJsAccount: Neon.wallet.Account
  signingCallback: api.SigningFunction
}

export type Candidate = {
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

export type GetCandidatesToVoteResponse = Candidate[]

export type GetVoteDetailsByAddressResponse = {
  candidateName?: string
  candidatePubKey?: string
  neoBalance: number
  address: string
}

export type VoteParams<BSName extends string> = {
  account: Account<BSName>
  candidatePubKey: string
}

export type VoteResponse = {
  transactionHash: string
}

export type CalculateVoteFeeParams<BSName extends string> = VoteParams<BSName>

export interface VoteService<BSName extends string> {
  getCandidatesToVote(): Promise<GetCandidatesToVoteResponse>
  getVoteDetailsByAddress(address: string): Promise<GetVoteDetailsByAddressResponse>
  vote(params: VoteParams<BSName>): Promise<VoteResponse>
  calculateVoteFee(params: CalculateVoteFeeParams<BSName>): Promise<string>
}
