import { BlockchainAlreadyExistError, InvalidBlockchainServiceError, BlockchainNotFoundError } from './exceptions'
import { Account, AccountWithDerivationPath, BlockchainService } from './interfaces'

export class BSAggregator<
  BSCustomName extends string = string,
  BSCustom extends BlockchainService<BSCustomName> = BlockchainService<BSCustomName>
> {
  readonly blockchainServicesByName: Record<BSCustomName, BSCustom>
  readonly blockchainServices: BlockchainService<BSCustomName>[]

  constructor(blockchainServices: Record<BSCustomName, BSCustom>) {
    this.blockchainServicesByName = blockchainServices
    this.blockchainServices = Object.values(blockchainServices)
  }

  addBlockchain(name: BSCustomName, blockchain: BSCustom) {
    if (this.blockchainServicesByName[name]) throw new BlockchainAlreadyExistError(name)
    this.blockchainServicesByName[name] = blockchain
    this.blockchainServices.push(blockchain)
  }

  validateAddressAllBlockchains(address: string) {
    return this.blockchainServices.some(bs => bs.validateAddress(address))
  }

  validateTextAllBlockchains(text: string) {
    return this.blockchainServices.some(bs =>
      [bs.validateAddress(text), bs.validateEncrypted(text), bs.validateKey(text)].some(it => it === true)
    )
  }

  validateKeyAllBlockchains(wif: string) {
    return this.blockchainServices.some(bs => bs.validateKey(wif))
  }

  validateEncryptedAllBlockchains(keyOrJson: string) {
    return this.blockchainServices.some(bs => bs.validateEncrypted(keyOrJson))
  }

  getBlockchainByName(name: BSCustomName): BlockchainService<BSCustomName> {
    const service = this.blockchainServicesByName[name]
    if (!service) throw new BlockchainNotFoundError(name)
    return this.blockchainServicesByName[name]
  }

  getBlockchainByAddress(address: string): BlockchainService<BSCustomName> | undefined {
    return this.blockchainServices.find(bs => bs.validateAddress(address))
  }

  getBlockchainByKey(wif: string): BlockchainService<BSCustomName> | undefined {
    return this.blockchainServices.find(bs => bs.validateKey(wif))
  }

  getBlockchainByEncrypted(keyOrJson: string): BlockchainService<BSCustomName> | undefined {
    return this.blockchainServices.find(bs => bs.validateEncrypted(keyOrJson))
  }

  async generateAccountFromMnemonicAllBlockchains(
    mnemonic: string,
    skippedAddresses?: string[]
  ): Promise<Map<BSCustomName, AccountWithDerivationPath[]>> {
    const mnemonicAccounts = new Map<BSCustomName, AccountWithDerivationPath[]>()

    const promises = this.blockchainServices.map(async service => {
      let index = 0
      const accounts: AccountWithDerivationPath[] = []

      while (true) {
        const generatedAccount = service.generateAccountFromMnemonic(mnemonic, index)
        if (skippedAddresses && skippedAddresses.find(address => address === generatedAccount.address)) {
          index++
          continue
        }

        if (index !== 0) {
          try {
            const { totalCount } = await service.blockchainDataService.getTransactionsByAddress({
              address: generatedAccount.address,
            })
            if (!totalCount || totalCount <= 0) break
          } catch {
            break
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
