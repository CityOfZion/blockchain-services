import { SolScanESSolana } from '../services/explorer/SolScanESSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { BSSolana } from '../BSSolana'

let solScanESSolana: SolScanESSolana<'test'>
let service: BSSolana<'test'>

describe('SolScanESSolana', () => {
  beforeEach(() => {
    service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)
    solScanESSolana = new SolScanESSolana(service)
  })

  it('Should return the transaction url', async () => {
    const transactionHash = '000'
    const url = solScanESSolana.buildTransactionUrl(transactionHash)
    expect(url).toBe(`https://solscan.io/tx/${transactionHash}?cluster=${service.network.id}`)
  })

  it('Should return the contract url', async () => {
    const contractHash = '000'
    const url = solScanESSolana.buildContractUrl(contractHash)
    expect(url).toBe(`https://solscan.io/token/${contractHash}?cluster=${service.network.id}`)
  })

  it('Should return the nft url', async () => {
    const tokenHash = '000'
    const url = solScanESSolana.buildNftUrl({
      tokenHash,
      collectionHash: '',
    })
    expect(url).toBe(`https://solscan.io/token/${tokenHash}?cluster=${service.network.id}`)
  })

  it('Should return an address template URL when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getAddressTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/account/{address}?cluster=${service.network.id}`)
  })

  it('Should return a transaction template URL when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = solScanESSolana.getTxTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/tx/{txId}?cluster=${service.network.id}`)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    service = new BSSolana('test', BSSolanaConstants.MAINNET_NETWORK)
    solScanESSolana = new SolScanESSolana(service)

    const templateUrl = solScanESSolana.getAddressTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/account/{address}`)
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    service = new BSSolana('test', BSSolanaConstants.MAINNET_NETWORK)
    solScanESSolana = new SolScanESSolana(service)

    const templateUrl = solScanESSolana.getTxTemplateUrl()

    expect(templateUrl).toBe(`https://solscan.io/tx/{txId}`)
  })
})
