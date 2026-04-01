import type { IBSNeo3, TBSNeo3Name } from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'
import {
  BSBigHumanAmount,
  type IClaimService,
  type TBSAccount,
  type TClaimServiceTransactionData,
  type TTransaction,
  type TTransactionDefault,
  type TTransactionDefaultEvent,
  type TTransactionDefaultTokenEvent,
  type TTransferParams,
} from '@cityofzion/blockchain-service'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'

export class ClaimServiceNeo3 implements IClaimService<TBSNeo3Name> {
  readonly _service: IBSNeo3

  claimToken = BSNeo3Constants.GAS_TOKEN
  burnToken = BSNeo3Constants.NEO_TOKEN

  constructor(service: IBSNeo3) {
    this._service = service
  }

  #buildClaimParams(senderAccount: TBSAccount<TBSNeo3Name>): TTransferParams<TBSNeo3Name> {
    return {
      senderAccount,
      intents: [{ amount: '0', receiverAddress: senderAccount.address, token: this.burnToken }],
    }
  }

  _getTransactionDataFromEvents(events: TTransactionDefaultEvent[]): TClaimServiceTransactionData | undefined {
    if (!events?.length) return

    const claimEvent = events.find(event => {
      return (
        event.eventType === 'token' &&
        event.token?.hash === this.claimToken.hash &&
        event.methodName === 'transfer' &&
        !event.from
      )
    })

    if (!claimEvent || !claimEvent.amount) return

    const hasBurnEvent = events.some(
      event =>
        event.eventType === 'token' &&
        event.token?.hash === this.burnToken.hash &&
        event.methodName === 'transfer' &&
        event.from === claimEvent.to
    )

    if (!hasBurnEvent) return

    return { isClaim: true }
  }

  async _buildTransactionEvent(address: string): Promise<TTransactionDefaultTokenEvent> {
    const amount = await this.getUnclaimed(address)

    return {
      eventType: 'token',
      amount,
      methodName: 'transfer',
      to: address,
      toUrl: this._service.explorerService.buildAddressUrl(address),
      tokenUrl: this._service.explorerService.buildContractUrl(this.claimToken.hash),
      token: this.claimToken,
    }
  }

  async getUnclaimed(address: string): Promise<string> {
    const { rpc } = BSNeo3NeonJsSingletonHelper.getInstance()

    const rpcClient = new rpc.RPCClient(this._service.network.url)
    const response = await rpcClient.getUnclaimedGas(address)

    return new BSBigHumanAmount(response, this.claimToken.decimals).toFormatted()
  }

  async calculateFee(senderAccount: TBSAccount<TBSNeo3Name>): Promise<string> {
    const claimParams = this.#buildClaimParams(senderAccount)

    return this._service.calculateTransferFee(claimParams)
  }

  async claim(senderAccount: TBSAccount<TBSNeo3Name>): Promise<TTransactionDefault> {
    const claimParams = this.#buildClaimParams(senderAccount)

    const claimEvent = await this._buildTransactionEvent(senderAccount.address)

    const [transaction] = await this._service.transfer(claimParams)

    transaction.events.push(claimEvent)

    const data: TClaimServiceTransactionData = { isClaim: true }
    transaction.data = data

    return transaction as TTransactionDefault
  }

  getTransactionData(transaction: TTransaction): TClaimServiceTransactionData | undefined {
    return transaction.data?.isClaim === true ? transaction.data : undefined
  }
}
