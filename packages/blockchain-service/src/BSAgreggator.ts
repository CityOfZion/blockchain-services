import { BlockchainAlreadyExist, InvalidBlockchainService } from './exceptions'
import { BlockchainService } from "./interfaces";
export class BSAgreggator<BSCustom extends BlockchainService = BlockchainService, BSCustomName extends string = string> {
    readonly blockchainservices: Record<BSCustomName, BSCustom>
    private bsList: BlockchainService<BSCustomName>[]

    constructor(blockchainservices: Record<BSCustomName, BSCustom>) {
        this.blockchainservices = blockchainservices
        this.bsList = Object.values(blockchainservices)
    }

    private haveBlockchainServices() {
        const blockchainservices = Object.values(this.blockchainservices)
        const rules = [
            Object.keys(blockchainservices).length > 1,
            Object.values(blockchainservices).length > 1,
        ]

        return rules.every(rule => rule === true)
    }

    addBlockchain(name: BSCustomName, blockchain: BSCustom) {
        if (this.blockchainservices[name]) throw new BlockchainAlreadyExist(name)
        this.blockchainservices[name] = blockchain
        this.bsList = Object.values(this.blockchainservices)
    }

    validateAddressesAllBlockchains(address: string) {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateAddress(address))
    }

    validateTextAllBlockchains(text: string) {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => [bs.validateAddress(text), bs.validateEncrypted(text), bs.validateKey(text)].some(it => it === true))
    }

    validateWifAllBlockchains(wif: string) {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateKey(wif))
    }

    validateEncryptedKeyAllBlockchains(encryptedKey: string) {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateEncrypted(encryptedKey))
    }

    getBlockchainByAddress(address: string): BlockchainService<BSCustomName> | null {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateAddress(address)) ?? null
    }

    getBlockchainByWif(wif: string): BlockchainService<BSCustomName> | null {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateKey(wif)) ?? null
    }

    getBlockchainByEncryptedKey(encryptedKey: string): BlockchainService<BSCustomName> | null {
        if (this.haveBlockchainServices()) throw new InvalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateEncrypted(encryptedKey)) ?? null
    }
}