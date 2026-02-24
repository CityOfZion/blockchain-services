import type { TBSAccount } from '@cityofzion/blockchain-service'
import { BSStellar } from '../BSStellar'
import { WalletConnectServiceStellar } from '../services/wallet-connect/WalletConnectServiceStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'

let service: BSStellar<'test'>
let walletConnectService: WalletConnectServiceStellar<'test'>
let account: TBSAccount<'test'>

const mnemonic = process.env.TEST_MNEMONIC

describe('WalletConnectServiceStellar', () => {
  beforeEach(async () => {
    service = new BSStellar('test', BSStellarConstants.TESTNET_NETWORK)
    walletConnectService = new WalletConnectServiceStellar(service)

    account = await service.generateAccountFromMnemonic(mnemonic, 3)
  })

  it("Should be able to get the network with 'stellar_getNetwork'", async () => {
    const { network, networkPassphrase } = await walletConnectService.stellar_getNetwork({
      account,
      params: {},
    })

    expect(network).toBeDefined()
    expect(networkPassphrase).toBeDefined()
  })

  it("Should be able to sign a message with 'stellar_signMessage'", async () => {
    const { signedMessage, signerAddress } = await walletConnectService.stellar_signMessage({
      account,
      params: { message: 'Hello, World!' },
    })

    expect(signedMessage).toBeDefined()
    expect(signerAddress).toEqual(account.address)
  })

  it("Should be able to sign an auth entry with 'stellar_signAuthEntry'", async () => {
    const { signedAuthEntry, signerAddress } = await walletConnectService.stellar_signAuthEntry({
      account,
      params: {
        xdr: 'AAAACXrDOZdUTjF10ma9AiQ5sizbFlCMARY/JuXLKj4QRal5Ueb3t2qeufIDkl6TAAAAAAAAAAHD5Dhm6FraoWtNw3xmsftfw43aav9gLsi5kDYD1ccr/gAAAApzdGFydF9nYW1lAAAAAAAFAAAAAy2DQRwAAAASAAAAAAAAAACO+drsns+C8ivJ7BbEvGPuuaf+RI7JYRYQh3tTDoG6yAAAABIAAAAAAAAAADzwlU9pvQCCZwaS876OkOohieXRjEidV8RoVpxgVhODAAAACgAAAAAAAAAAAAAAAAAPQkAAAAAKAAAAAAAAAAAAAAAAAA9CQAAAAAEAAAAAAAAAAQ711IO2j2xojpimQQ1dzE4A9Kskd2MeHXPKwLGFTKYYAAAACnN0YXJ0X2dhbWUAAAAAAAYAAAASAAAAAcPkOGboWtqha03DfGax+1/Djdpq/2AuyLmQNgPVxyv+AAAAAy2DQRwAAAASAAAAAAAAAACO+drsns+C8ivJ7BbEvGPuuaf+RI7JYRYQh3tTDoG6yAAAABIAAAAAAAAAADzwlU9pvQCCZwaS876OkOohieXRjEidV8RoVpxgVhODAAAACgAAAAAAAAAAAAAAAAAPQkAAAAAKAAAAAAAAAAAAAAAAAA9CQAAAAAA=',
      },
    })

    expect(signedAuthEntry).toBeDefined()
    expect(signerAddress).toEqual(account.address)
  })

  it("Should be able to sign a transaction with 'stellar_signXDR'", async () => {
    const stellarAccount = new stellarSDK.Account(account.address, '-1')
    const xdr = new stellarSDK.TransactionBuilder(stellarAccount, {
      fee: stellarSDK.BASE_FEE,
      networkPassphrase: stellarSDK.Networks.TESTNET,
    })
      .setTimeout(0)
      .addOperation(
        stellarSDK.Operation.manageData({
          name: 'Hello',
          value: account.address,
        })
      )
      .build()

    const { signedXDR, signerAddress } = await walletConnectService.stellar_signXDR({
      account,
      params: {
        xdr: xdr.toXDR(),
      },
    })

    expect(signedXDR).toBeDefined()
    expect(signerAddress).toEqual(account.address)
  })
})
