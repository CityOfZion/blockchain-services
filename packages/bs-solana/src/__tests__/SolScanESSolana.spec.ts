import { SolScanESSolana } from '../services/explorer/SolScanESSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { TokenServiceSolana } from '../services/token/TokenServiceSolana'

let solScanESSolana: SolScanESSolana
let tokenService: TokenServiceSolana
const network = BSSolanaConstants.TESTNET_NETWORKS[0]

describe('SolScanESSolana', () => {
  beforeEach(() => {
    tokenService = new TokenServiceSolana()
    solScanESSolana = new SolScanESSolana(network, tokenService)
  })

  it('Should return the transaction url', async () => {
    const transactionHash = '000'
    const url = solScanESSolana.buildTransactionUrl(transactionHash)
    expect(url).toBe(`https://solscan.io/tx/${transactionHash}?cluster=${network.id}`)
  })

  it('Should return the contract url', async () => {
    const contractHash = '000'
    const url = solScanESSolana.buildContractUrl(contractHash)
    expect(url).toBe(`https://solscan.io/token/${contractHash}?cluster=${network.id}`)
  })

  it('Should return the nft url', async () => {
    const tokenHash = '000'
    const url = solScanESSolana.buildNftUrl({
      tokenHash,
      collectionHash: '',
    })
    expect(url).toBe(`https://solscan.io/token/${tokenHash}?cluster=${network.id}`)
  })

  it('Should return an address template URL when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getAddressTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/account/{address}?cluster=${network.id}`)
  })

  it('Should return a transaction template URL when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getTxTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/tx/{txId}?cluster=${network.id}`)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    solScanESSolana = new SolScanESSolana(BSSolanaConstants.MAINNET_NETWORKS[0], tokenService)

    const templateUrl = solScanESSolana.getAddressTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/account/{address}`)
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    solScanESSolana = new SolScanESSolana(BSSolanaConstants.MAINNET_NETWORKS[0], tokenService)

    const templateUrl = solScanESSolana.getTxTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/tx/{txId}`)
  })
})
