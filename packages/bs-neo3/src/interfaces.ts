import { Account } from '@cityofzion/blockchain-service'

type AxiosCandidate = {
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

export type AxiosGetCandidatesToVoteResponse = AxiosCandidate[]

type CandidateType = 'consensus' | 'council'

type Candidate = {
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
  type: CandidateType
}

export type GetCandidatesToVoteResponse = Candidate[]

export type AxiosGetVoteDetailsByAddressResponse = {
  vote: string
  candidate: string
  candidatePubkey: string
  balance: number
}

export type GetVoteDetailsByAddressResponse = {
  candidateName: string
  candidatePubKey: string
  neoBalance: number
}

export type VoteParams<BSName extends string> = {
  account: Account<BSName>
  candidatePubKey: string
}

export type VoteResponse = {
  transactionHash: string
}

export type CalculateVoteFeeParams<BSName extends string> = VoteParams<BSName>

export type GetVoteCIMParams = {
  address: string
  candidatePubKey: string
}
