import {
  CalculateVoteFeeParams,
  GetCandidatesToVoteResponse,
  GetVoteDetailsByAddressResponse,
  VoteParams,
  VoteResponse,
  VoteService,
} from '../../interfaces'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import { BSNumberHelper } from '@cityofzion/blockchain-service'
import { ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { tx } from '@cityofzion/neon-js'
import { BSNeo3 } from '../../BSNeo3'

type GetVoteCIMParams = {
  address: string
  candidatePubKey: string
}

export abstract class RpcVoteServiceNeo3<BSName extends string> implements VoteService<BSName> {
  readonly _service: BSNeo3<BSName>

  protected constructor(service: BSNeo3<BSName>) {
    this._service = service
  }

  abstract getCandidatesToVote(): Promise<GetCandidatesToVoteResponse>

  abstract getVoteDetailsByAddress(_address: string): Promise<GetVoteDetailsByAddressResponse>

  async vote({ account, candidatePubKey }: VoteParams<BSName>): Promise<VoteResponse> {
    if (!BSNeo3Helper.isMainnet(this._service.network)) throw new Error('Only Mainnet is supported')
    if (!candidatePubKey) throw new Error('Missing candidatePubKey param')

    const { neonJsAccount, signingCallback } = await this._service.generateSigningCallback(account)

    const invoker = await NeonInvoker.init({
      rpcAddress: this._service.network.url,
      account: neonJsAccount,
      signingCallback,
    })

    const transactionHash = await invoker.invokeFunction(
      this.#getVoteCIM({
        address: account.address,
        candidatePubKey,
      })
    )

    return { transactionHash }
  }

  async calculateVoteFee({ account, candidatePubKey }: CalculateVoteFeeParams<BSName>): Promise<string> {
    if (!BSNeo3Helper.isMainnet(this._service.network)) throw new Error('Only Mainnet is supported')
    if (!candidatePubKey) throw new Error('Missing candidatePubKey param')

    const { neonJsAccount } = await this._service.generateSigningCallback(account)

    const invoker = await NeonInvoker.init({
      rpcAddress: this._service.network.url,
      account: neonJsAccount,
    })

    const { total } = await invoker.calculateFee(
      this.#getVoteCIM({
        address: account.address,
        candidatePubKey,
      })
    )

    return BSNumberHelper.formatNumber(total, { decimals: this._service.feeToken.decimals })
  }

  #getVoteCIM({ address, candidatePubKey }: GetVoteCIMParams): ContractInvocationMulti {
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
