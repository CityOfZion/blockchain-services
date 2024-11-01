import { fetchAccountsForBlockchainServices } from './functions'
import { Account, BlockchainService } from './interfaces'

export class BSAggregator<BSName extends string = string> {
  readonly blockchainServicesByName: Record<BSName, BlockchainService<BSName>>
  readonly #blockchainServices: BlockchainService<BSName>[]

  constructor(blockchainServices: BlockchainService<BSName>[]) {
    this.#blockchainServices = blockchainServices

    this.blockchainServicesByName = blockchainServices.reduce(
      (acc, service) => {
        if (acc[service.name]) {
          throw new Error(`Duplicate blockchain service name: ${service.name}`)
        }

        acc[service.name] = service
        return acc
      },
      {} as Record<BSName, BlockchainService<BSName>>
    )
  }

  validateAddressAllBlockchains(address: string) {
    return this.#blockchainServices.some(bs => bs.validateAddress(address))
  }

  validateTextAllBlockchains(text: string) {
    return this.#blockchainServices.some(bs =>
      [bs.validateAddress(text), bs.validateEncrypted(text), bs.validateKey(text)].some(it => it === true)
    )
  }

  validateKeyAllBlockchains(wif: string) {
    return this.#blockchainServices.some(bs => bs.validateKey(wif))
  }

  validateEncryptedAllBlockchains(keyOrJson: string) {
    return this.#blockchainServices.some(bs => bs.validateEncrypted(keyOrJson))
  }

  getBlockchainNameByAddress(address: string): BSName[] {
    return this.#blockchainServices.filter(bs => bs.validateAddress(address)).map(bs => bs.name)
  }

  getBlockchainNameByKey(wif: string): BSName[] {
    return this.#blockchainServices.filter(bs => bs.validateKey(wif)).map(bs => bs.name)
  }

  getBlockchainNameByEncrypted(keyOrJson: string): BSName[] {
    return this.#blockchainServices.filter(bs => bs.validateEncrypted(keyOrJson)).map(bs => bs.name)
  }

  async generateAccountsFromMnemonic(mnemonic: string): Promise<Map<BSName, Account<BSName>[]>> {
    return fetchAccountsForBlockchainServices(
      this.#blockchainServices,
      async (service: BlockchainService<BSName>, index: number) => {
        return service.generateAccountFromMnemonic(mnemonic, index)
      }
    )
  }
}
