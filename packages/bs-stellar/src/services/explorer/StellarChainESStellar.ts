import type { IExplorerService, TBuildNftUrlParams } from '@cityofzion/blockchain-service'
import type { IBSStellar, TBSStellarNetworkId } from '../../types'

export class StellarChainESStellar<N extends string> implements IExplorerService {
  #baseUrl: string

  readonly stellarChainUrlByNetworkType: Record<TBSStellarNetworkId, string> = {
    pubnet: 'https://stellarchain.io',
    testnet: 'https://testnet.stellarchain.io',
  }

  constructor(service: IBSStellar<N>) {
    this.#baseUrl = this.stellarChainUrlByNetworkType[service.network.id]
  }

  #validateValueLength(value?: string): value is string {
    return !!value?.length && value.length >= 4
  }

  buildTransactionUrl(transactionId: string) {
    if (!this.#validateValueLength(transactionId)) return undefined

    return this.getTransactionTemplateUrl()?.replace('{txId}', transactionId)
  }

  buildContractUrl(contractHash: string) {
    if (!this.#validateValueLength(contractHash)) return undefined

    return this.getContractTemplateUrl()?.replace('{hash}', contractHash)
  }

  buildNftUrl(_params: TBuildNftUrlParams) {
    return this.getNftTemplateUrl()
  }

  buildAddressUrl(address: string) {
    if (!this.#validateValueLength(address)) return undefined

    return this.getAddressTemplateUrl()?.replace('{address}', address)
  }

  getAddressTemplateUrl() {
    return `${this.#baseUrl}/address/{address}`
  }

  getTransactionTemplateUrl() {
    return `${this.#baseUrl}/transactions/{txId}`
  }

  getNftTemplateUrl() {
    return undefined
  }

  // Contract is an address on Stellar
  getContractTemplateUrl() {
    return `${this.#baseUrl}/address/{hash}`
  }
}
