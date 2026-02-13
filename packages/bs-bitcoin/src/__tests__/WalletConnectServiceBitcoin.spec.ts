import type { IWalletConnectService } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { WalletConnectServiceBitcoin } from '../services/wallet-connect/WalletConnectServiceBitcoin'
import type { IBSBitcoin } from '../types'

describe.skip('WalletConnectServiceBitcoin', () => {
  let service: IBSBitcoin<'test'>
  let walletConnectService: IWalletConnectService<'test'>

  beforeEach(async () => {
    service = new BSBitcoin('test')
    walletConnectService = new WalletConnectServiceBitcoin(service)

    // TODO: remove it
    console.log(walletConnectService)
  })

  // TODO: implement the tests
  it('', () => {})
})
