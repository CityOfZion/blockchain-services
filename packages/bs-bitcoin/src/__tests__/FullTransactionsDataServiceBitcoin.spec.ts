import type { IFullTransactionsDataService } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { FullTransactionsDataServiceBitcoin } from '../services/full-transactions-data/FullTransactionsDataServiceBitcoin'
import type { IBSBitcoin } from '../types'

describe.skip('FullTransactionsDataServiceBitcoin', () => {
  let service: IBSBitcoin<'test'>
  let fullTransactionsDataService: IFullTransactionsDataService<'test'>

  beforeEach(async () => {
    service = new BSBitcoin('test')
    fullTransactionsDataService = new FullTransactionsDataServiceBitcoin(service)

    // TODO: remove it
    console.log(fullTransactionsDataService)
  })

  // TODO: implement the tests
  it('', () => {})
})
