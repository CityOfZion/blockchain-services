import { BSNeoX } from '../BSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

let bsNeoX: BSNeoX<'test'>

describe('BSNeoX', () => {
  beforeEach(async () => {
    bsNeoX = new BSNeoX('test', BSNeoXConstants.TESTNET_NETWORK)
  })

  it.skip('Should be able to transfer a native token using a EVM', async () => {
    const account = bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const [transactionHash] = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.0000000000001',
          receiverAddress: '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89',
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  })
})
