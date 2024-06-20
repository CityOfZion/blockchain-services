import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { LedgerSigner } from '../LedgerServiceEthereum'
import { ethers } from 'ethers'

let ledgerSigner: LedgerSigner

describe('LedgerServiceEthereum', () => {
  beforeAll(async () => {
    const transport = await TransportNodeHid.create()
    ledgerSigner = new LedgerSigner(transport)
  }, 60000)

  it('Should be able to get address', async () => {
    const address = await ledgerSigner.getAddress()
    expect(address).toBeDefined()
  })

  it('Should be able to get public key', async () => {
    const publicKey = await ledgerSigner.getPublicKey()
    expect(publicKey).toBeDefined()
  })

  it('Should be able to sign a message', async () => {
    const message = 'Hello, World!'
    const signedMessage = await ledgerSigner.signMessage(message)
    expect(signedMessage).toBeDefined()
  }, 60000)

  it('Should be able to sign a transaction', async () => {
    const transaction = {
      from: '0xD833aBAa9fF467A1Ea1b999316F0b33117df08Fc',
      to: '0xD833aBAa9fF467A1Ea1b999316F0b33117df08Fc',
      data: '0x',
      nonce: '0x09',
      gasPrice: '0x05c21c',
      gasLimit: '0x5208',
      value: '0x00',
    }

    const signedTransaction = await ledgerSigner.signTransaction(transaction)

    expect(signedTransaction).toBeDefined()
  })

  it.only('Should be able to sign a typed data', async () => {
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

    const signature = await ledgerSigner._signTypedData(typedData.domain, typedData.types, typedData.message)

    const signatureAddress = ethers.utils.verifyTypedData(
      typedData.domain,
      typedData.types,
      typedData.message,
      signature
    )

    const address = await ledgerSigner.getAddress()

    expect(signatureAddress).toEqual(address)
  }, 60000)
})
