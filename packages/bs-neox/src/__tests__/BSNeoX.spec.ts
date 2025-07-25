import { BSNeoX } from '../BSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

let bsNeoX: BSNeoX<'neox'>

describe('BSNeoX', () => {
  beforeEach(async () => {
    bsNeoX = new BSNeoX('neox', BSNeoXConstants.TESTNET_NETWORKS[0])
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
  }, 60000)
})
