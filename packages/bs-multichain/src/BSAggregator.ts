import {
  Account,
  BlockchainService,
  generateAccountForBlockchainService,
  hasEncryption,
  UntilIndexRecord,
} from '@cityofzion/blockchain-service'

export class BSAggregator<BSName extends string> {
  readonly blockchainServicesByName: Record<BSName, BlockchainService<BSName>>
  readonly #blockchainServices: BlockchainService<BSName>[]

  constructor(blockchainServices: BlockchainService<BSName>[]) {
    this.#blockchainServices = blockchainServices
    this.blockchainServicesByName = blockchainServices.reduce(
      (acc, service) => {
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
      [bs.validateAddress(text), hasEncryption(bs) && bs.validateEncrypted(text), bs.validateKey(text)].some(
        it => it === true
      )
    )
  }

  validateKeyAllBlockchains(wif: string) {
    return this.#blockchainServices.some(bs => bs.validateKey(wif))
  }

  validateEncryptedAllBlockchains(keyOrJson: string) {
    return this.#blockchainServices.some(bs => hasEncryption(bs) && bs.validateEncrypted(keyOrJson))
  }

  getBlockchainNameByAddress(address: string): BSName[] {
    return this.#blockchainServices.filter(bs => bs.validateAddress(address)).map(bs => bs.name)
  }

  getBlockchainNameByKey(wif: string): BSName[] {
    return this.#blockchainServices.filter(bs => bs.validateKey(wif)).map(bs => bs.name)
  }

  getBlockchainNameByEncrypted(keyOrJson: string): BSName[] {
    return this.#blockchainServices
      .filter(bs => hasEncryption(bs) && bs.validateEncrypted(keyOrJson))
      .map(bs => bs.name)
  }

  async generateAccountsFromMnemonic(
    mnemonic: string,
    untilIndexByBlockchainService?: UntilIndexRecord<BSName>
  ): Promise<Map<BSName, Account<BSName>[]>> {
    return generateAccountForBlockchainService(
      this.#blockchainServices,
      async (service: BlockchainService<BSName>, index: number) => {
        return service.generateAccountFromMnemonic(mnemonic, index)
      },
      untilIndexByBlockchainService
    )
  }
}
