import { BlockchainService, Claimable } from "./interfaces";
export declare class BSAgreggator<BSCustom extends BlockchainService = BlockchainService, BSCustomName extends string = string> {
    protected blockchainservices: Record<BSCustomName, BSCustom>;
    private bsList;
    constructor(blockchainservices: Record<BSCustomName, BSCustom>);
    private haveBlockchainServices;
    addBlockchain(name: BSCustomName, blockchain: BSCustom): void;
    validateAddressesAllBlockchains(address: string): boolean;
    validateTextAllBlockchains(text: string): boolean;
    validateWifAllBlockchains(wif: string): boolean;
    validateEncryptedKeyAllBlockchains(encryptedKey: string): boolean;
    getBlockchainByAddress(address: string): BlockchainService;
    getBlockchainByWif(wif: string): BlockchainService;
    getBlockchainByEncryptedKey(encryptedKey: string): BlockchainService;
    getBlockchainsClaimable(): (BlockchainService & Claimable)[];
}
