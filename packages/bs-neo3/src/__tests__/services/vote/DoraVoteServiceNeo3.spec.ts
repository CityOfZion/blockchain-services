import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { BSNeo3 } from '../../../BSNeo3'
import { DoraVoteServiceNeo3 } from '../../../services/vote/DoraVoteServiceNeo3'
import { TBSAccount } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

describe('DoraVoteServiceNeo3', () => {
  let doraVoteServiceNeo3: DoraVoteServiceNeo3<'test'>
  let account: TBSAccount<'test'>
  const cozCandidatePubKey = '02946248f71bdf14933e6735da9867e81cc9eea0b5895329aa7f71e7745cf40659'
  const testnetNetwork = BSNeo3Constants.TESTNET_NETWORK

  beforeEach(() => {
    const bsNeo3 = new BSNeo3('test')

    doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(bsNeo3)

    account = bsNeo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
  })

  describe('getCandidatesToVote', () => {
    it("Shouldn't be able to get candidates to vote when is using a Testnet network", async () => {
      doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(new BSNeo3('test', testnetNetwork))

      await expect(doraVoteServiceNeo3.getCandidatesToVote()).rejects.toThrow('Only Mainnet is supported')
    })

    it('Should be able to get candidates to vote when is using a Mainnet network', async () => {
      const response = await doraVoteServiceNeo3.getCandidatesToVote()

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
      doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(new BSNeo3('test', testnetNetwork))

      await expect(doraVoteServiceNeo3.getVoteDetailsByAddress(address)).rejects.toThrow('Only Mainnet is supported')
    })

    it("Shouldn't be able to get vote details by address when there isn't address", async () => {
      await expect(doraVoteServiceNeo3.getVoteDetailsByAddress('')).rejects.toThrow('Missing address')
    })

    it("Shouldn't be able to get vote details by address when address is invalid", async () => {
      await expect(doraVoteServiceNeo3.getVoteDetailsByAddress('invalidAddress')).rejects.toThrow('Invalid address')
    })

    it('Should be able to get vote details by address when address is valid', async () => {
      const response = await doraVoteServiceNeo3.getVoteDetailsByAddress(address)

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
      doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(new BSNeo3('test', testnetNetwork))

      await expect(
        doraVoteServiceNeo3.calculateVoteFee({ account, candidatePubKey: cozCandidatePubKey })
      ).rejects.toThrow('Only Mainnet is supported')
    })

    it("Shouldn't be able to calculate vote fee when there isn't candidatePubKey", async () => {
      await expect(doraVoteServiceNeo3.calculateVoteFee({ account, candidatePubKey: '' })).rejects.toThrow(
        'Missing candidatePubKey param'
      )
    })

    it('Should be able to calculate vote fee', async () => {
      const fee = await doraVoteServiceNeo3.calculateVoteFee({ account, candidatePubKey: cozCandidatePubKey })

      expect(fee).toEqual(expect.any(String))
    })
  })

  describe('vote (RpcVoteServiceNeo3)', () => {
    it("Shouldn't be able to vote when is using a Testnet network", async () => {
      doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(new BSNeo3('test', testnetNetwork))

      await expect(doraVoteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })).rejects.toThrow(
        'Only Mainnet is supported'
      )
    })

    it("Shouldn't be able to vote when there isn't candidatePubKey", async () => {
      await expect(doraVoteServiceNeo3.vote({ account, candidatePubKey: '' })).rejects.toThrow(
        'Missing candidatePubKey param'
      )
    })

    it.skip('Should be able to vote with success', async () => {
      const transactionHash = await doraVoteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })

      expect(transactionHash).toEqual(expect.any(String))
    })

    it.skip('Should be able to vote using Ledger with success', async () => {
      const transport = await TransportNodeHid.create()
      const bsNeo3 = new BSNeo3('test', undefined, async () => transport)

      doraVoteServiceNeo3 = new DoraVoteServiceNeo3<'test'>(bsNeo3)

      account = await bsNeo3.ledgerService.getAccount(transport, 0)

      const transactionHash = await doraVoteServiceNeo3.vote({ account, candidatePubKey: cozCandidatePubKey })

      transport.close()

      expect(transactionHash).toEqual(expect.any(String))
    }, 120_000)
  })
})
