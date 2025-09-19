import { BSBigNumberHelper, BSCommonConstants } from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import {
  IBSNeo3,
  IVoteService,
  TDoraVoteServiceNeo3GetCommitteeApiResponse,
  TDoraVoteServiceNeo3GetVoteCIMParams,
  TDoraVoteServiceNeo3GetVoteDetailsByAddressApiResponse,
  TVoteServiceCandidate,
  TVoteServiceDetailsByAddressResponse,
  TVoteServiceVoteParams,
} from '../../types'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'
import {
  BSNeo3NeonDappKitSingletonHelper,
  ContractInvocationMulti,
} from '../../helpers/BSNeo3NeonDappKitSingletonHelper'

export class DoraVoteServiceNeo3<N extends string> implements IVoteService<N> {
  readonly _service: IBSNeo3<N>

  #apiInstance?: AxiosInstance

  constructor(service: IBSNeo3<N>) {
    this._service = service
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = axios.create({ baseURL: `${BSCommonConstants.DORA_URL}/api/v2/neo3` })
    }
    return this.#apiInstance
  }

  async getCandidatesToVote(): Promise<TVoteServiceCandidate[]> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Only Mainnet is supported')

    const { data } = await this.#api.get<TDoraVoteServiceNeo3GetCommitteeApiResponse[]>('/mainnet/committee')

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

  async getVoteDetailsByAddress(address: string): Promise<TVoteServiceDetailsByAddressResponse> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Only Mainnet is supported')
    if (!address) throw new Error('Missing address')
    if (!this._service.validateAddress(address)) throw new Error('Invalid address')

    const { data } = await this.#api.get<TDoraVoteServiceNeo3GetVoteDetailsByAddressApiResponse>(
      `/mainnet/voter/${address}`
    )

    return {
      candidateName: data.candidate ?? undefined,
      candidatePubKey: data.candidatePubkey ?? undefined,
      neoBalance: data.balance,
      address,
    }
  }

  async vote({ account, candidatePubKey }: TVoteServiceVoteParams<N>): Promise<string> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Only Mainnet is supported')
    if (!candidatePubKey) throw new Error('Missing candidatePubKey param')

    const { neonJsAccount, signingCallback } = await this._service.generateSigningCallback(account)

    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this._service.network.url,
      account: neonJsAccount,
      signingCallback,
    })

    const cim = this.#getVoteCIM({
      address: account.address,
      candidatePubKey,
    })

    const transactionHash = await invoker.invokeFunction(cim)

    return transactionHash
  }

  async calculateVoteFee({ account, candidatePubKey }: TVoteServiceVoteParams<N>): Promise<string> {
    if (!BSNeo3Helper.isMainnetNetwork(this._service.network)) throw new Error('Only Mainnet is supported')
    if (!candidatePubKey) throw new Error('Missing candidatePubKey param')

    const { neonJsAccount } = await this._service.generateSigningCallback(account)

    const { NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({
      rpcAddress: this._service.network.url,
      account: neonJsAccount,
    })

    const cim = this.#getVoteCIM({
      address: account.address,
      candidatePubKey,
    })

    const { total } = await invoker.calculateFee(cim)

    return BSBigNumberHelper.format(total, { decimals: this._service.feeToken.decimals })
  }

  #getVoteCIM({ address, candidatePubKey }: TDoraVoteServiceNeo3GetVoteCIMParams): ContractInvocationMulti {
    const { tx } = BSNeo3NeonJsSingletonHelper.getInstance()

    return {
      invocations: [
        {
          scriptHash: 'ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
          operation: 'vote',
          args: [
            { type: 'Hash160', value: address },
            { type: 'PublicKey', value: candidatePubKey },
          ],
        },
      ],
      signers: [{ scopes: tx.WitnessScope.CalledByEntry }],
    }
  }
}
