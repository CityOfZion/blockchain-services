import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { BSNeo3 } from '../BSNeo3'
import { VoteServiceNeo3 } from '../services/vote/VoteServiceNeo3'
import type { TBSAccount } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import type { TBSNeo3Name } from '../types'

let voteServiceNeo3: VoteServiceNeo3
let account: TBSAccount<TBSNeo3Name>

const cozCandidatePubKey = '02946248f71bdf14933e6735da9867e81cc9eea0b5895329aa7f71e7745cf40659'
const testnetNetwork = BSNeo3Constants.TESTNET_NETWORK

describe('VoteServiceNeo3', () => {
  beforeEach(async () => {
    const bsNeo3 = new BSNeo3()

    voteServiceNeo3 = new VoteServiceNeo3(bsNeo3)

    account = await bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
  })

  describe('getCandidatesToVote', () => {
    it("Shouldn't be able to get candidates to vote when is using a Testnet network", async () => {
      voteServiceNeo3 = new VoteServiceNeo3(new BSNeo3(testnetNetwork))

      await expect(voteServiceNeo3.getCandidatesToVote()).rejects.toThrow('Only Mainnet is supported')
    })

    it('Should be able to get candidates to vote when is using a Mainnet network', async () => {
      const response = await voteServiceNeo3.getCandidatesToVote()

      expect(response).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: expect.any(Number),
            name: expect.any(String),
            description: expect.any(String),
            location: expect.any(String),
            email: expect.any(String),
            website: expect.any(String),
            hash: expect.any(String),
            pubKey: expect.any(String),
            votes: expect.any(Number),
            logoUrl: expect.anything(),
            type: expect.stringMatching(/^(consensus|council)$/),
          }),
        ])
      )
    })
  })

  describe('getVoteDetailsByAddress', () => {
    const address = 'Nbgjdh2MmB9oWUY7Botk6Yy58eCzuPrQFW'

    it("Shouldn't be able to get vote details by address when is using a Testnet network", async () => {
      voteServiceNeo3 = new VoteServiceNeo3(new BSNeo3(testnetNetwork))

      await expect(voteServiceNeo3.getVoteDetailsByAddress(address)).rejects.toThrow('Only Mainnet is supported')
    })

    it("Shouldn't be able to get vote details by address when there isn't address", async () => {
      await expect(voteServiceNeo3.getVoteDetailsByAddress('')).rejects.toThrow('Missing address')
    })

    it("Shouldn't be able to get vote details by address when address is invalid", async () => {
      await expect(voteServiceNeo3.getVoteDetailsByAddress('invalidAddress')).rejects.toThrow('Invalid address')
    })

    it('Should be able to get vote details by address when address is valid', async () => {
      const response = await voteServiceNeo3.getVoteDetailsByAddress(address)

      expect(response).toEqual(
        expect.objectContaining({
          candidateName: expect.any(String),
          candidatePubKey: expect.any(String),
          neoBalance: expect.any(Number),
        })
      )
    })
  })

  describe('calculateVoteFee (RpcVoteServiceNeo3)', () => {
    it("Shouldn't be able to calculate vote fee when is using a Testnet network", async () => {
      voteServiceNeo3 = new VoteServiceNeo3(new BSNeo3(testnetNetwork))

      await expect(voteServiceNeo3.calculateVoteFee({ account, candidatePubKey: cozCandidatePubKey })).rejects.toThrow(
        'Only Mainnet is supported'
      )
    })

    it("Shouldn't be able to calculate vote fee when there isn't candidatePubKey", async () => {
      await expect(voteServiceNeo3.calculateVoteFee({ account, candidatePubKey: '' })).rejects.toThrow(
        'Missing candidatePubKey param'
      )
    })

    it('Should be able to calculate vote fee', async () => {
      const fee = await voteServiceNeo3.calculateVoteFee({ account, candidatePubKey: cozCandidatePubKey })

      expect(fee).toEqual(expect.any(String))
    })
  })

  describe('vote (RpcVoteServiceNeo3)', () => {
    it("Shouldn't be able to vote when is using a Testnet network", async () => {
      voteServiceNeo3 = new VoteServiceNeo3(new BSNeo3(testnetNetwork))

      await expect(voteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })).rejects.toThrow(
        'Only Mainnet is supported'
      )
    })

    it("Shouldn't be able to vote when there isn't candidatePubKey", async () => {
      await expect(voteServiceNeo3.vote({ account, candidatePubKey: '' })).rejects.toThrow(
        'Missing candidatePubKey param'
      )
    })

    it.skip('Should be able to vote with success', async () => {
      const transaction = await voteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })

      expect(transaction).toEqual({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        blockchain: 'neo3',
        isPending: true,
        type: 'vote',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: '0',
            methodName: 'vote',
            tokenUrl: expect.any(String),
            token: BSNeo3Constants.NEO_TOKEN,
          },
        ],
      })
    })

    it.skip('Should be able to vote using Ledger with success', async () => {
      const transport = await TransportNodeHid.create()
      const bsNeo3 = new BSNeo3(undefined, async () => transport)

      voteServiceNeo3 = new VoteServiceNeo3(bsNeo3)
      account = await bsNeo3.ledgerService.getAccount(transport, 0)

      const transaction = await voteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })

      await transport.close()

      expect(transaction).toEqual({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        systemFeeAmount: expect.any(String),
        blockchain: 'neo3',
        isPending: true,
        view: 'default',
        events: [
          {
            eventType: 'generic',
            methodName: 'vote',
            from: account.address,
            fromUrl: bsNeo3.explorerService.buildAddressUrl(account.address),
            amount: '1',
            data: { candidate: cozCandidatePubKey, token: BSNeo3Constants.NEO_TOKEN.symbol },
          },
        ],
      })
    })
  })
})
