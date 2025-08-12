import { SimpleSwapService } from '../features/swap/SimpleSwapService'

describe('SimpleSwapService', () => {
  const simpleSwapService = new SimpleSwapService()

  it('Should get the swap status by swap id', async () => {
    const result = await simpleSwapService.getStatus(process.env.TEST_SWAP_ID)

    expect(result).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        txFrom: null,
        txTo: null,
        log: expect.any(String),
      })
    )
  })
})
