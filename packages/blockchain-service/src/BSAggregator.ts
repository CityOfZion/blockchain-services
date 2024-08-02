import { AccountWithDerivationPath, BlockchainService } from './interfaces'

export class BSAggregator<
  BSCustomName extends string = string,
  BSCustom extends BlockchainService<BSCustomName, string> = BlockchainService<BSCustomName, string>,
> {
  readonly blockchainServicesByName: Record<BSCustomName, BSCustom>
  readonly #blockchainServices: BSCustom[]

  constructor(blockchainServices: Record<BSCustomName, BSCustom>) {
    this.blockchainServicesByName = blockchainServices
    this.#blockchainServices = Object.values(blockchainServices)
  }

  addBlockchain(name: BSCustomName, blockchain: BSCustom) {
    if (this.blockchainServicesByName[name]) throw new Error(`The blockchain ${name} already exist`)
    this.blockchainServicesByName[name] = blockchain
    this.#blockchainServices.push(blockchain)
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

  getBlockchainNameByAddress(address: string): BSCustomName[] {
    return this.#blockchainServices.filter(bs => bs.validateAddress(address)).map(bs => bs.blockchainName)
  }

  getBlockchainNameByKey(wif: string): BSCustomName[] {
    return this.#blockchainServices.filter(bs => bs.validateKey(wif)).map(bs => bs.blockchainName)
  }

  getBlockchainNameByEncrypted(keyOrJson: string): BSCustomName[] {
    return this.#blockchainServices.filter(bs => bs.validateEncrypted(keyOrJson)).map(bs => bs.blockchainName)
  }

  async generateAccountFromMnemonicAllBlockchains(
    mnemonic: string,
    skippedAddresses?: string[]
  ): Promise<Map<BSCustomName, AccountWithDerivationPath[]>> {
    const mnemonicAccounts = new Map<BSCustomName, AccountWithDerivationPath[]>()

    const promises = this.#blockchainServices.map(async service => {
      let index = 0
      const accounts: AccountWithDerivationPath[] = []
      let hasError = false

      while (!hasError) {
        const generatedAccount = service.generateAccountFromMnemonic(mnemonic, index)
        if (skippedAddresses && skippedAddresses.find(address => address === generatedAccount.address)) {
          index++
          continue
        }

        if (index !== 0) {
          try {
            const { transactions } = await service.blockchainDataService.getTransactionsByAddress({
              address: generatedAccount.address,
            })
            if (!transactions || transactions.length <= 0) hasError = true
          } catch {
            hasError = true
          }
        }

        accounts.push(generatedAccount)
        index++
      }

      mnemonicAccounts.set(service.blockchainName, accounts)
    })

    await Promise.all(promises)

    return mnemonicAccounts
  }
}
