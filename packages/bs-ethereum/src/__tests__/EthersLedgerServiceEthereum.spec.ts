import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { ethers } from 'ethers'
import { EthersLedgerServiceEthereum } from '../services/ledger/EthersLedgerServiceEthereum'
import Transport from '@ledgerhq/hw-transport'
import { BSEthereum } from '../BSEthereum'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'

let ledgerService: EthersLedgerServiceEthereum<'test'>
let transport: Transport
let bsEthereum: BSEthereum<'test'>

describe.skip('EthersLedgerServiceEthereum', () => {
  beforeAll(async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.ethereum.find(network => network.type === 'testnet')!
    bsEthereum = new BSEthereum('test', 'ethereum', network)

    transport = await TransportNodeHid.create()
    ledgerService = new EthersLedgerServiceEthereum(bsEthereum, async () => transport)
  })

  it('Should be able to get address', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const signer = ledgerService.getSigner(transport, account.bip44Path!)
    const address = await signer.getAddress()
    expect(address).toBeDefined()
  })

  it('Should be able to sign a message', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const signer = ledgerService.getSigner(transport, account.bip44Path!)

    const message = 'Hello, World!'
    const signedMessage = await signer.signMessage(message)
    expect(signedMessage).toBeDefined()
  })

  it('Should be able to sign a transaction', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const signer = ledgerService.getSigner(transport, account.bip44Path!)

    const transaction = {
      from: '0xD833aBAa9fF467A1Ea1b999316F0b33117df08Fc',
      to: '0xD833aBAa9fF467A1Ea1b999316F0b33117df08Fc',
      data: '0x',
      nonce: '0x09',
      gasPrice: '0x05c21c',
      gasLimit: '0x5208',
      value: '0x00',
    }

    const signedTransaction = await signer.signTransaction(transaction)

    expect(signedTransaction).toBeDefined()
  })

  it('Should be able to sign a typed data', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const signer = ledgerService.getSigner(transport, account.bip44Path!)

    const typedData = {
      types: {
        Person: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'wallet',
            type: 'address',
          },
        ],
        Mail: [
          {
            name: 'from',
            type: 'Person',
          },
          {
            name: 'to',
            type: 'Person',
          },
          {
            name: 'contents',
            type: 'string',
          },
        ],
      },
      primaryType: 'Mail',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      },
      message: {
        from: {
          name: 'Cow',
          wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
        oiiir: 'dsadsada',
      },
    }

    const signature = await signer._signTypedData(typedData.domain, typedData.types, typedData.message)

    const signatureAddress = ethers.utils.verifyTypedData(
      typedData.domain,
      typedData.types,
      typedData.message,
      signature
    )

    const address = await signer.getAddress()

    expect(signatureAddress).toEqual(address)
  })

  it('Should be able to get all accounts automatically', async () => {
    const accounts = await ledgerService.getAccounts(transport)
    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bip44Path: bsEthereum.bip44DerivationPath.replace('?', index.toString()),
        })
      )
    })
  })

  it('Should be able to get all accounts until index', async () => {
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
          bip44Path: bsEthereum.bip44DerivationPath.replace('?', index.toString()),
        })
      )
    })
  })

  it('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'publicKey',
        bip44Path: bsEthereum.bip44DerivationPath.replace('?', '0'),
      })
    )
  })
})
