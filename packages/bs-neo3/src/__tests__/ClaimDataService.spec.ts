import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3 } from '../BSNeo3'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { ClaimServiceNeo3 } from '../services/claim/ClaimServiceNeo3'
import type { TBSNeo3NetworkId } from '../types'
import type { TBSNetwork } from '@cityofzion/blockchain-service'

let claimService: ClaimServiceNeo3
let bsNeo3: BSNeo3
let network: TBSNetwork<TBSNeo3NetworkId>

describe('ClaimServiceNeo3', () => {
  beforeEach(() => {
    network = BSNeo3Constants.TESTNET_NETWORK
    bsNeo3 = new BSNeo3(network)
    claimService = new ClaimServiceNeo3(bsNeo3)
  })

  it('Should be able to get unclaimed', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const unclaimed = await claimService.getUnclaimed(account.address)

    expect(unclaimed).toMatch(/^0\.0\d*[1-9]$/)
  })

  it.skip('Should be able to calculate the claim fee', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const fee = await claimService.calculateFee(account)

    expect(fee).toEqual(expect.stringMatching(/^0\.0\d*[1-9]$/))
  })

  it.skip('Should be able to claim', async () => {
    const account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const unclaimed = await claimService.getUnclaimed(account.address)

    expect(Number(unclaimed)).toBeGreaterThan(0)

    const transaction = await claimService.claim(account)

    const claimEvent = claimService._buildTransactionEvent(account.address)

    expect(transaction).toEqual({
      txId: expect.any(String),
      txIdUrl: expect.any(String),
      date: expect.any(String),
      invocationCount: expect.any(Number),
      blockchain: 'neo3',
      isPending: true,
      relatedAddress: account.address,
      networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
      systemFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
      view: 'default',
      events: [
        claimEvent,
        {
          eventType: 'token',
          amount: '0',
          methodName: 'transfer',
          from: account.address,
          fromUrl: expect.any(String),
          to: account.address,
          toUrl: expect.any(String),
          tokenUrl: expect.any(String),
          token: claimService.burnToken,
        },
      ],
      data: { isClaim: true },
    })
  })

  it.skip('Should be able to calculate the claim fee with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeo3 = new BSNeo3(network, async () => transport)

    const account = await bsNeo3.ledgerService.getAccount(transport, 0)
    const fee = await claimService.calculateFee(account)

    expect(fee).toEqual(expect.stringMatching(/^0\.0\d*[1-9]$/))
  })

  it.skip('Should be able to claim with Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeo3 = new BSNeo3(network, async () => transport)

    const account = await bsNeo3.ledgerService.getAccount(transport, 0)
    const unclaimed = await claimService.getUnclaimed(account.address)

    expect(Number(unclaimed)).toBeGreaterThan(0)

    const transaction = await claimService.claim(account)

    const claimEvent = claimService._buildTransactionEvent(account.address)

    expect(transaction).toEqual({
      txId: expect.any(String),
      txIdUrl: expect.any(String),
      date: expect.any(String),
      invocationCount: expect.any(Number),
      blockchain: 'neo3',
      isPending: true,
      networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
      systemFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
      view: 'default',
      events: [
        claimEvent,
        {
          eventType: 'token',
          amount: '0',
          methodName: 'transfer',
          from: account.address,
          fromUrl: expect.any(String),
          to: account.address,
          toUrl: expect.any(String),
          tokenUrl: expect.any(String),
          token: claimService.burnToken,
        },
      ],
      data: { isClaim: true },
    })
  })
})
