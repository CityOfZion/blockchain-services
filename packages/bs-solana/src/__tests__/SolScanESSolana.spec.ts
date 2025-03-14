import { SolScanESSolana } from '../services/explorer/SolScanESSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'

let solScanESSolana: SolScanESSolana
const network = BSSolanaConstants.TESTNET_NETWORKS[0]

describe('SolScanESSolana', () => {
  beforeEach(() => {
    solScanESSolana = new SolScanESSolana(network)
  })

  it('Should return the transaction url', async () => {
    const transactionHash = '0x000'
    const url = solScanESSolana.buildTransactionUrl(transactionHash)
    expect(url).toBe(`https://solscan.io/tx/${transactionHash}?cluster=${network.id}`)
  })

  it('Should return the contract url', async () => {
    const contractHash = '0x000'
    const url = solScanESSolana.buildContractUrl(contractHash)
    expect(url).toBe(`https://solscan.io/token/${contractHash}?cluster=${network.id}`)
  })

  it('Should return the nft url', async () => {
    const tokenHash = '0x000'
    const url = solScanESSolana.buildNftUrl({
      tokenHash,
      collectionHash: '',
    })
    expect(url).toBe(`https://solscan.io/token/${tokenHash}?cluster=${network.id}`)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getAddressTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/account/{address}?cluster=${network.id}`)
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getTxTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/tx/{txId}?cluster=${network.id}`)
  })
})
