import { exception } from './excpetions'
import { BlockchainService, Claimable } from "./interfaces";
export class BSAgreggator<BSCustom extends BlockchainService = BlockchainService, BSCustomName extends string = string> {
    protected blockchainservices: Record<BSCustomName, BSCustom>
    private bsList: BlockchainService[]
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
        if (this.blockchainservices[name]) exception.blockchainAlreadyExist(name)
        this.blockchainservices[name] = blockchain
        this.bsList = Object.values(this.blockchainservices)
    }
    validateAddressesAllBlockchains(address: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateAddress(address))
    }
    validateTextAllBlockchains(text: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => [bs.validateAddress(text), bs.validateEncryptedKey(text), bs.validateWif(text)].some(it => it === true))
    }
    validateWifAllBlockchains(wif: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateWif(wif))
    }
    validateEncryptedKeyAllBlockchains(encryptedKey: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.some(bs => bs.validateEncryptedKey(encryptedKey))
    }
    getBlockchainByAddress(address: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateAddress(address)) ?? null
    }
    getBlockchainByWif(wif: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateWif(wif)) ?? null
    }
    getBlockchainByEncryptedKey(encryptedKey: string) {
        if (this.haveBlockchainServices()) exception.invalidBlockchainService(JSON.stringify(this.blockchainservices))
        return this.bsList.find(bs => bs.validateEncryptedKey(encryptedKey)) ?? null
    }
    getBlockchainsClaimable() {
        const methodName = {claim: 'claim', getUnclaimed: 'getUnclaimed'}
        const claimableBlockchains = this.bsList.filter(blockchain => methodName.claim in blockchain && methodName.getUnclaimed in blockchain.dataService) as Array<BlockchainService & Claimable>
        return claimableBlockchains
    }
}