import {
  generateAccountForBlockchainService,
  hasEncryption,
  type TBSAccount,
  type IBlockchainService,
  type TUntilIndexRecord,
} from '@cityofzion/blockchain-service'
import type { TBSService, TBSServiceByName, TBSServiceName } from './types'

export class BSAggregator<
  S extends TBSService[] = TBSService[],
  T = [TBSService] extends [S[number]] ? Partial<TBSServiceByName<S>> : TBSServiceByName<S>,
> {
  readonly blockchainServicesByName: T
  readonly blockchainServices: S
  readonly blockchainServicesByNameRecord: Record<TBSServiceName, IBlockchainService<TBSServiceName, string>>

  constructor(blockchainServices: S) {
    this.blockchainServices = blockchainServices
    this.blockchainServicesByName = blockchainServices.reduce((acc, service) => {
      acc[service.name as keyof T] = service as any
      return acc
    }, {} as T)

    this.blockchainServicesByNameRecord = this.blockchainServicesByName as Record<
      TBSServiceName,
      IBlockchainService<TBSServiceName, string>
    >
  }

  validateAddressAllBlockchains(address: string) {
    return this.blockchainServices.some(bs => bs.validateAddress(address))
  }

  validateTextAllBlockchains(text: string) {
    return this.blockchainServices.some(bs =>
      [bs.validateAddress(text), hasEncryption(bs) && bs.validateEncrypted(text), bs.validateKey(text)].some(
        it => it === true
      )
    )
  }

  validateKeyAllBlockchains(wif: string) {
    return this.blockchainServices.some(bs => bs.validateKey(wif))
  }

  validateEncryptedAllBlockchains(keyOrJson: string) {
    return this.blockchainServices.some(bs => hasEncryption(bs) && bs.validateEncrypted(keyOrJson))
  }

  getBlockchainNameByAddress(address: string): TBSServiceName[] {
    return this.blockchainServices.filter(bs => bs.validateAddress(address)).map(bs => bs.name)
  }

  getBlockchainNameByKey(wif: string): TBSServiceName[] {
    return this.blockchainServices.filter(bs => bs.validateKey(wif)).map(bs => bs.name)
  }

  getBlockchainNameByEncrypted(keyOrJson: string): TBSServiceName[] {
    return this.blockchainServices.filter(bs => hasEncryption(bs) && bs.validateEncrypted(keyOrJson)).map(bs => bs.name)
  }

  async generateAccountsFromMnemonic(
    mnemonic: string,
    untilIndexByBlockchainService?: TUntilIndexRecord<TBSServiceName>
  ): Promise<Map<TBSServiceName, TBSAccount<TBSServiceName>[]>> {
    return generateAccountForBlockchainService(
      this.blockchainServices,
      async (service: IBlockchainService<TBSServiceName, string>, index: number) => {
        return await service.generateAccountFromMnemonic(mnemonic, index)
      },
      untilIndexByBlockchainService
    )
  }
}
