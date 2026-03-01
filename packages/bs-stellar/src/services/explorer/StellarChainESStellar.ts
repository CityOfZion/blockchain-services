import type { IExplorerService, TBuildNftUrlParams } from '@cityofzion/blockchain-service'
import type { IBSStellar, TBSStellarNetworkId } from '../../types'

export class StellarChainESStellar<N extends string> implements IExplorerService {
  #baseUrl: string

  readonly stellarChainUrlByNetworkType: Record<TBSStellarNetworkId, string> = {
    pubnet: 'https://stellarchain.io',
    testnet: 'https://testnet.stellarchain.io',
  }

  constructor(service: IBSStellar<N>) {
    this.#baseUrl = `${this.stellarChainUrlByNetworkType[service.network.id]}`
  }

  buildTransactionUrl(hash: string): string | undefined {
    if (!hash?.length) return undefined

    return `${this.#baseUrl}/transactions/${hash}`
  }

  buildContractUrl(contractHash: string): string | undefined {
    if (!contractHash?.length) return undefined

    return `${this.#baseUrl}/contracts/${contractHash}`
  }

  buildNftUrl(_params: TBuildNftUrlParams): string | undefined {
    return undefined
  }

  buildAddressUrl(address: string): string | undefined {
    if (!address?.length) return undefined

    return `${this.#baseUrl}/accounts/${address}`
  }

  getAddressTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/accounts/{address}`
  }

  getTxTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/transactions/{txId}`
  }

  getNftTemplateUrl(): string | undefined {
    return undefined
  }

  getContractTemplateUrl(): string | undefined {
    return `${this.#baseUrl}/contracts/{hash}`
  }
}
