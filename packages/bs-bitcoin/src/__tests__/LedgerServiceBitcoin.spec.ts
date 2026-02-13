import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import type { IBSBitcoin } from '../types'
import { BSKeychainHelper, type ILedgerService } from '@cityofzion/blockchain-service'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import { BSBitcoin } from '../BSBitcoin'
import { LedgerServiceBitcoin } from '../services/ledger/LedgerServiceBitcoin'

describe.skip('LedgerServiceBitcoin', () => {
  const blockchain = 'test'

  let service: IBSBitcoin<'test'>
  let ledgerService: ILedgerService<'test'>
  let transport: Transport
  let getLedgerTransport: () => Promise<Transport>

  beforeEach(async () => {
    if (transport) await transport.close()

    transport = await TransportNodeHid.create()

    getLedgerTransport = async () => transport

    service = new BSBitcoin(blockchain, undefined, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)
  })

  it.skip('Should be able to get all accounts automatically', async () => {
    const accounts = await ledgerService.getAccounts(transport)

    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get all accounts until index', async () => {
    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      test: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)

    expect(account).toEqual({
      address: expect.any(String),
      key: expect.any(String),
      type: 'publicKey',
      bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
      isHardware: true,
      blockchain,
    })
  })

  it.skip('Should be able to get all accounts automatically using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const accounts = await ledgerService.getAccounts(transport)

    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get all accounts until index using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      test: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, index),
          isHardware: true,
          blockchain,
        })
      )
    })
  })

  it.skip('Should be able to get account using Testnet', async () => {
    service = new BSBitcoin(blockchain, BSBitcoinConstants.TESTNET_NETWORK, getLedgerTransport)
    ledgerService = new LedgerServiceBitcoin(service, getLedgerTransport)

    const account = await ledgerService.getAccount(transport, 0)

    expect(account).toEqual({
      address: expect.any(String),
      key: expect.any(String),
      type: 'publicKey',
      bipPath: BSKeychainHelper.getBipPath(service.bipDerivationPath, 0),
      isHardware: true,
      blockchain,
    })
  })
})
