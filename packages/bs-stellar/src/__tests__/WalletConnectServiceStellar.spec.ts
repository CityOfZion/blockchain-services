import { type TBSAccount } from '@cityofzion/blockchain-service'
import { BSStellar } from '../BSStellar'
import { WalletConnectServiceStellar } from '../services/wallet-connect/WalletConnectServiceStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import * as stellarSDK from '@stellar/stellar-sdk'
import type { TBSStellarName } from '../types'

let service: BSStellar
let walletConnectService: WalletConnectServiceStellar
let account: TBSAccount<TBSStellarName>

const mnemonic = process.env.TEST_MNEMONIC

const buildXDR = (address: string) => {
  const stellarAccount = new stellarSDK.Account(address, '-1')
  return new stellarSDK.TransactionBuilder(stellarAccount, {
    fee: stellarSDK.BASE_FEE,
    networkPassphrase: stellarSDK.Networks.TESTNET,
  })
    .setTimeout(0)
    .addOperation(stellarSDK.Operation.manageData({ name: 'Test', value: address }))
    .build()
    .toXDR()
}

describe('WalletConnectServiceStellar', () => {
  beforeEach(async () => {
    service = new BSStellar(BSStellarConstants.TESTNET_NETWORK)
    walletConnectService = new WalletConnectServiceStellar(service)

    account = await service.generateAccountFromMnemonic(mnemonic, 3)
  })

  it('Should have correct namespace and chain', () => {
    expect(walletConnectService.namespace).toBe('stellar')
    expect(walletConnectService.chain).toBe('stellar:testnet')
  })

  it('Should have supported methods', () => {
    expect(walletConnectService.supportedMethods).toContain('stellar_signXDR')
    expect(walletConnectService.supportedMethods).toContain('stellar_signAndSubmitXDR')
    expect(walletConnectService.supportedMethods).toContain('stellar_signMessage')
    expect(walletConnectService.supportedMethods).toContain('stellar_signAuthEntry')
    expect(walletConnectService.supportedMethods).toContain('stellar_getNetwork')
  })

  it('Should have calculable methods', () => {
    expect(walletConnectService.calculableMethods).toContain('stellar_signAndSubmitXDR')
    expect(walletConnectService.calculableMethods).toHaveLength(1)
  })

  it('Should have auto approve methods', () => {
    expect(walletConnectService.autoApproveMethods).toContain('stellar_getNetwork')
    expect(walletConnectService.autoApproveMethods).toHaveLength(1)
  })

  it('Should have empty supported events', () => {
    expect(walletConnectService.supportedEvents).toEqual([])
  })

  it("Shouldn't be able to validate stellar_signXDR with invalid params", async () => {
    await expect(walletConnectService.handlers.stellar_signXDR.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signXDR.validate({ xdr: 123 })).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signXDR.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate stellar_signXDR params', async () => {
    const result = await walletConnectService.handlers.stellar_signXDR.validate({ xdr: 'some-xdr-string' })
    expect(result).toEqual({ xdr: 'some-xdr-string' })
  })

  it("Should be able to sign a transaction with 'stellar_signXDR'", async () => {
    const xdr = buildXDR(account.address)

    const { signedXDR, signerAddress } = await walletConnectService.handlers.stellar_signXDR.process({
      account,
      params: { xdr },
      method: 'stellar_signXDR',
    })

    expect(signedXDR).toBeDefined()
    expect(typeof signedXDR).toBe('string')
    expect(signerAddress).toEqual(account.address)
  })

  it('The signed XDR should be parseable and contain a valid signature', async () => {
    const xdr = buildXDR(account.address)

    const { signedXDR } = await walletConnectService.handlers.stellar_signXDR.process({
      account,
      params: { xdr },
      method: 'stellar_signXDR',
    })

    const signedTx = new stellarSDK.Transaction(signedXDR, stellarSDK.Networks.TESTNET)
    expect(signedTx.signatures).toHaveLength(1)
    expect(signedTx.signatures[0].signature()).toBeDefined()

    const keypair = stellarSDK.Keypair.fromPublicKey(account.address)
    const txHash = signedTx.hash()
    expect(keypair.verify(txHash, signedTx.signatures[0].signature())).toBe(true)
  })

  it("Shouldn't be able to validate stellar_signAndSubmitXDR with invalid params", async () => {
    await expect(walletConnectService.handlers.stellar_signAndSubmitXDR.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signAndSubmitXDR.validate({ xdr: 123 })).rejects.toThrow()
  })

  it('Should be able to validate stellar_signAndSubmitXDR params', async () => {
    const result = await walletConnectService.handlers.stellar_signAndSubmitXDR.validate({ xdr: 'some-xdr-string' })
    expect(result).toEqual({ xdr: 'some-xdr-string' })
  })

  it("Shouldn't be able to calculate request fee with invalid params", async () => {
    await expect(
      walletConnectService.calculateRequestFee({
        account,
        method: 'stellar_signAndSubmitXDR',
        params: 'invalid',
      })
    ).rejects.toThrow()
  })

  it("Should be able to calculate request fee for 'stellar_signAndSubmitXDR'", async () => {
    const xdr = buildXDR(account.address)

    const fee = await walletConnectService.calculateRequestFee({
      account,
      method: 'stellar_signAndSubmitXDR',
      params: { xdr },
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
    expect(typeof fee).toBe('string')
  })

  it("Shouldn't be able to validate stellar_signMessage with invalid params", async () => {
    await expect(walletConnectService.handlers.stellar_signMessage.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signMessage.validate({ message: 123 })).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signMessage.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate stellar_signMessage params', async () => {
    const result = await walletConnectService.handlers.stellar_signMessage.validate({ message: 'Hello!' })
    expect(result).toEqual({ message: 'Hello!' })
  })

  it("Should be able to sign a message with 'stellar_signMessage'", async () => {
    const { signedMessage, signerAddress } = await walletConnectService.handlers.stellar_signMessage.process({
      account,
      params: { message: 'Hello, World!' },
      method: 'stellar_signMessage',
    })

    expect(signedMessage).toBeDefined()
    expect(typeof signedMessage).toBe('string')
    expect(signerAddress).toEqual(account.address)
  })

  it("Should produce a base64 signature with 'stellar_signMessage'", async () => {
    const { signedMessage } = await walletConnectService.handlers.stellar_signMessage.process({
      account,
      params: { message: 'Hello, World!' },
      method: 'stellar_signMessage',
    })

    expect(Buffer.from(signedMessage, 'base64').length).toBe(64)
  })

  it("Should produce a deterministic signature for the same message in 'stellar_signMessage'", async () => {
    const params = { message: 'Hello, World!' }
    const args = { account, params, method: 'stellar_signMessage' as const }

    const { signedMessage: sig1 } = await walletConnectService.handlers.stellar_signMessage.process(args)
    const { signedMessage: sig2 } = await walletConnectService.handlers.stellar_signMessage.process(args)

    expect(sig1).toBe(sig2)
  })

  it("Shouldn't be able to validate stellar_signAuthEntry with invalid params", async () => {
    await expect(walletConnectService.handlers.stellar_signAuthEntry.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.stellar_signAuthEntry.validate({ xdr: 123 })).rejects.toThrow()
  })

  it('Should be able to validate stellar_signAuthEntry params', async () => {
    const result = await walletConnectService.handlers.stellar_signAuthEntry.validate({ xdr: 'some-xdr-string' })
    expect(result).toEqual({ xdr: 'some-xdr-string' })
  })

  it("Should be able to sign an auth entry with 'stellar_signAuthEntry'", async () => {
    const { signedAuthEntry, signerAddress } = await walletConnectService.handlers.stellar_signAuthEntry.process({
      account,
      params: {
        xdr: 'AAAACXrDOZdUTjF10ma9AiQ5sizbFlCMARY/JuXLKj4QRal5Ueb3t2qeufIDkl6TAAAAAAAAAAHD5Dhm6FraoWtNw3xmsftfw43aav9gLsi5kDYD1ccr/gAAAApzdGFydF9nYW1lAAAAAAAFAAAAAy2DQRwAAAASAAAAAAAAAACO+drsns+C8ivJ7BbEvGPuuaf+RI7JYRYQh3tTDoG6yAAAABIAAAAAAAAAADzwlU9pvQCCZwaS876OkOohieXRjEidV8RoVpxgVhODAAAACgAAAAAAAAAAAAAAAAAPQkAAAAAKAAAAAAAAAAAAAAAAAA9CQAAAAAEAAAAAAAAAAQ711IO2j2xojpimQQ1dzE4A9Kskd2MeHXPKwLGFTKYYAAAACnN0YXJ0X2dhbWUAAAAAAAYAAAASAAAAAcPkOGboWtqha03DfGax+1/Djdpq/2AuyLmQNgPVxyv+AAAAAy2DQRwAAAASAAAAAAAAAACO+drsns+C8ivJ7BbEvGPuuaf+RI7JYRYQh3tTDoG6yAAAABIAAAAAAAAAADzwlU9pvQCCZwaS876OkOohieXRjEidV8RoVpxgVhODAAAACgAAAAAAAAAAAAAAAAAPQkAAAAAKAAAAAAAAAAAAAAAAAA9CQAAAAAA=',
      },
      method: 'stellar_signAuthEntry',
    })

    expect(signedAuthEntry).toBeDefined()
    expect(typeof signedAuthEntry).toBe('string')
    expect(() => Buffer.from(signedAuthEntry, 'base64')).not.toThrow()
    expect(signerAddress).toEqual(account.address)
  })

  it('Should be able to validate stellar_getNetwork params', async () => {
    await expect(walletConnectService.handlers.stellar_getNetwork.validate(undefined)).resolves.not.toThrow()
  })

  it("Should be able to get the network with 'stellar_getNetwork'", async () => {
    const { network, networkPassphrase } = await walletConnectService.handlers.stellar_getNetwork.process({
      account,
      params: {},
      method: 'stellar_getNetwork',
    })

    expect(network).toBe('TESTNET')
    expect(networkPassphrase).toBe(stellarSDK.Networks.TESTNET)
  })

  it('Should return PUBLIC network when service uses pubnet', async () => {
    const pubnetService = new BSStellar(BSStellarConstants.MAINNET_NETWORK)
    const pubnetWCS = new WalletConnectServiceStellar(pubnetService)

    const { network, networkPassphrase } = await pubnetWCS.handlers.stellar_getNetwork.process({
      account,
      params: {},
      method: 'stellar_getNetwork',
    })

    expect(network).toBe('PUBLIC')
    expect(networkPassphrase).toBe(stellarSDK.Networks.PUBLIC)
  })
})
