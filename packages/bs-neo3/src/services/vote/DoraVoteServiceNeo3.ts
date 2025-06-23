import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { BSCommonConstants } from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { RpcVoteServiceNeo3 } from './RpcVoteServiceNeo3'
import { GetCandidatesToVoteResponse, GetVoteDetailsByAddressResponse } from '../../interfaces'
import { BSNeo3 } from '../../BSNeo3'

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

export type AxiosGetVoteDetailsByAddressResponse = {
  vote: string
  candidate: string
  candidatePubkey: string
  balance: number
}

export class DoraVoteServiceNeo3<BSName extends string> extends RpcVoteServiceNeo3<BSName> {
  readonly #service: BSNeo3<BSName>
  readonly #doraAxiosInstance: AxiosInstance

  constructor(service: BSNeo3<BSName>) {
    super(service)

    this.#service = service
    this.#doraAxiosInstance = axios.create({ baseURL: `${BSCommonConstants.DORA_URL}/api/v2/neo3` })
  }

  async getCandidatesToVote(): Promise<GetCandidatesToVoteResponse> {
    if (!BSNeo3Helper.isMainnet(this.#service.network)) throw new Error('Only Mainnet is supported')

    const { data } = await this.#doraAxiosInstance.get<AxiosGetCandidatesToVoteResponse>('/mainnet/committee')

    return data.map(({ logo, ...candidate }, index) => {
      const position = index + 1

      return {
        position,
        name: candidate.name,
        description: candidate.description,
        location: candidate.location,
        email: candidate.email,
        website: candidate.website,
        hash: candidate.scripthash,
        pubKey: candidate.pubkey,
        votes: candidate.votes,
        logoUrl: logo.startsWith('https://') ? logo : undefined,
        type: position <= 7 ? 'consensus' : 'council',
      }
    })
  }

  async getVoteDetailsByAddress(address: string): Promise<GetVoteDetailsByAddressResponse> {
    if (!BSNeo3Helper.isMainnet(this.#service.network)) throw new Error('Only Mainnet is supported')
    if (!address) throw new Error('Missing address')
    if (!this.#service.validateAddress(address)) throw new Error('Invalid address')

    const { data } = await this.#doraAxiosInstance.get<AxiosGetVoteDetailsByAddressResponse>(
      `/mainnet/voter/${address}`
    )

    return {
      candidateName: data.candidate ?? undefined,
      candidatePubKey: data.candidatePubkey ?? undefined,
      neoBalance: data.balance,
      address,
    }
  }
}
