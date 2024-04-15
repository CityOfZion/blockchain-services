import { Account, LedgerService } from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import { ethers } from 'ethers'

export class LedgerServiceEthereum implements LedgerService {
  readonly #defaultPath = "44'/60'/0'/0/0"

  constructor(public getLedgerTransport?: (account: Account) => Promise<Transport>) {}

  async getAddress(transport: Transport): Promise<string> {
    const ledgerApp = new LedgerEthereumApp(transport)
    const { address } = await ledgerApp.getAddress(this.#defaultPath)

    return address
  }

  async getPublicKey(transport: Transport): Promise<string> {
    const ledgerApp = new LedgerEthereumApp(transport)
    const { publicKey } = await ledgerApp.getAddress(this.#defaultPath)

    return '0x' + publicKey
  }

  async getSignTransactionFunction(transport: Transport) {
    return async (transaction: ethers.providers.TransactionRequest): Promise<string> => {
      const ledgerApp = new LedgerEthereumApp(transport)

      const unsignedTransaction: ethers.utils.UnsignedTransaction = {
        ...transaction,
        nonce: transaction.nonce ? ethers.BigNumber.from(transaction.nonce).toNumber() : undefined,
      }

      const serializedUnsignedTransaction = ethers.utils.serializeTransaction(unsignedTransaction).substring(2)

      const resolution = await LedgerEthereumAppService.resolveTransaction(serializedUnsignedTransaction, {}, {})
      const signature = await ledgerApp.signTransaction(this.#defaultPath, serializedUnsignedTransaction, resolution)

      return ethers.utils.serializeTransaction(unsignedTransaction, {
        v: ethers.BigNumber.from('0x' + signature.v).toNumber(),
        r: '0x' + signature.r,
        s: '0x' + signature.s,
      })
    }
  }
}
