import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { DoraESNeo3 } from '../../../services/explorer/DoraESNeo3'

let doraESNeo3: DoraESNeo3

describe('DoraESNeo3', () => {
  beforeAll(() => {
    doraESNeo3 = new DoraESNeo3(BSNeo3Constants.DEFAULT_NETWORK)
  })
  it('Should return a transaction url', async () => {
    const hash = '0x775d824a54d4e9bebf3c522a7d8dede550348323d833ce68fbcf0ab953d579e8'
    const url = doraESNeo3.buildTransactionUrl(hash)

    expect(url).toEqual(`https://dora.coz.io/transaction/neo3/mainnet/${hash}`)
  })

  it('Should return a nft url', async () => {
    const contractHash = '0x577a51f7d39162c9de1db12a6b319c848e4c54e5'
    const tokenId = 'rAI='
    const url = doraESNeo3.buildNftUrl({ contractHash, tokenId })

    expect(url).toEqual(`https://dora.coz.io/nft/neo3/mainnet/${contractHash}/${tokenId}`)
  })
})
