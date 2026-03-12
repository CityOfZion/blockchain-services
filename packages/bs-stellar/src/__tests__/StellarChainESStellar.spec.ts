import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import { StellarChainESStellar } from '../services/explorer/StellarChainESStellar'

let stellarChainESStellar: StellarChainESStellar<'test'>

describe('StellarChainESStellar', () => {
  beforeEach(() => {
    const service = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK)
    stellarChainESStellar = new StellarChainESStellar(service)
  })

  it('Should return the transaction url', async () => {
    const transactionHash = '0000'
    const url = stellarChainESStellar.buildTransactionUrl(transactionHash)
    expect(url).toBe(`https://testnet.stellarchain.io/transactions/${transactionHash}`)
  })

  it('Should return the contract url', async () => {
    const contractHash = '0000'
    const url = stellarChainESStellar.buildContractUrl(contractHash)
    expect(url).toBe(`https://testnet.stellarchain.io/address/${contractHash}`)
  })

  it('Should return an address template URL when call the getAddressTemplateUrl method', () => {
    const templateUrl = stellarChainESStellar.getAddressTemplateUrl()
    expect(templateUrl).toBe(`https://testnet.stellarchain.io/address/{address}`)
  })

  it('Should return a transaction template URL when call the getTransactionTemplateUrl method', () => {
    const templateUrl = stellarChainESStellar.getTransactionTemplateUrl()
    expect(templateUrl).toBe(`https://testnet.stellarchain.io/transactions/{txId}`)
  })

  it('Should return a transaction template URL when call the getContractTemplateUrl method', () => {
    const templateUrl = stellarChainESStellar.getContractTemplateUrl()
    expect(templateUrl).toBe(`https://testnet.stellarchain.io/address/{hash}`)
  })
})
