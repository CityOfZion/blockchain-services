import {
  Account,
  IBlockchainService,
  generateAccountForBlockchainService,
  hasEncryption,
  UntilIndexRecord,
} from '@cityofzion/blockchain-service'

export class BSAggregator<N extends string> {
  readonly blockchainServicesByName: Record<N, IBlockchainService<N>>
  readonly #blockchainServices: IBlockchainService<N>[]

  constructor(blockchainServices: IBlockchainService<N>[]) {
    this.#blockchainServices = blockchainServices
    this.blockchainServicesByName = blockchainServices.reduce((acc, service) => {
      acc[service.name] = service
      return acc
    }, {} as Record<N, IBlockchainService<N>>)
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

  getBlockchainNameByAddress(address: string): N[] {
    return this.#blockchainServices.filter(bs => bs.validateAddress(address)).map(bs => bs.name)
  }

  getBlockchainNameByKey(wif: string): N[] {
    return this.#blockchainServices.filter(bs => bs.validateKey(wif)).map(bs => bs.name)
  }

  getBlockchainNameByEncrypted(keyOrJson: string): N[] {
    return this.#blockchainServices
      .filter(bs => hasEncryption(bs) && bs.validateEncrypted(keyOrJson))
      .map(bs => bs.name)
  }

  async generateAccountsFromMnemonic(
    mnemonic: string,
    untilIndexByBlockchainService?: UntilIndexRecord<N>
  ): Promise<Map<N, Account<N>[]>> {
    return generateAccountForBlockchainService(
      this.#blockchainServices,
      async (service: IBlockchainService<N>, index: number) => {
        return service.generateAccountFromMnemonic(mnemonic, index)
      },
      untilIndexByBlockchainService
    )
  }
}
