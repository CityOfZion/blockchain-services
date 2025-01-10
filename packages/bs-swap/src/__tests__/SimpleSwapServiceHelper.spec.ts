import { SimpleSwapServiceHelper } from '../helpers/SimpleSwapServiceHelper'

describe('SimpleSwapServiceHelper', () => {
  const simpleSwapServiceHelper = new SimpleSwapServiceHelper()

  it('Should get the swap status by swap id', async () => {
    const result = await simpleSwapServiceHelper.getStatus(process.env.TEST_SWAP_ID)

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
