import { BSSolana } from '../BSSolana'
import * as bip39 from 'bip39'
import solanaSDK from '@solana/web3.js'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import HDKey from 'micro-key-producer/slip10.js'
import bs58 from 'bs58'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

const network = BSSolanaConstants.TESTNET_NETWORKS.find(network => network.id === 'devnet')!

let bsSolana: BSSolana<'solana'>
const mnemonic = process.env.TEST_MNEMONIC as string
let accountKeypair: { base58Key: string; base58Address: string; bufferKey: string }

const keys = {
  moralisApiKey: process.env.MORALIS_API_KEY!,
  tatumMainnetApiKey: process.env.TATUM_MAINNET_API_KEY!,
  tatumTestnetApiKey: process.env.TATUM_TESTNET_API_KEY!,
}

describe('BSEthereum', () => {
  beforeEach(async () => {
    bsSolana = new BSSolana('solana', keys, network)

    const bip44Path = bsSolana.bip44DerivationPath.replace('?', '0')
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const hd = HDKey.fromMasterSeed(seed.toString('hex'))
    const keypair = solanaSDK.Keypair.fromSeed(hd.derive(bip44Path).privateKey)

    accountKeypair = {
      base58Key: bs58.encode(keypair.secretKey),
      base58Address: keypair.publicKey.toBase58(),
      bufferKey: keypair.secretKey.toString(),
    }
  })

  it('Should be able to validate an address', () => {
    const validAddress = accountKeypair.base58Address
    const invalidAddress = 'invalid address'
    const anotherInvalidAddress = '0x0000000000000000000000000000000000000000'

    expect(bsSolana.validateAddress(validAddress)).toBeTruthy()
    expect(bsSolana.validateAddress(invalidAddress)).toBeFalsy()
    expect(bsSolana.validateAddress(anotherInvalidAddress)).toBeFalsy()
  })

  it('Should be able to validate a key', () => {
    const validKey = accountKeypair.base58Key
    const bufferValidKey = accountKeypair.bufferKey
    const invalidKey = 'invalid key'
    const anotherInvalidKey = '3213, 21, 2, 23, 211'

    expect(bsSolana.validateKey(validKey)).toBeTruthy()
    expect(bsSolana.validateKey(bufferValidKey.toString())).toBeTruthy()
    expect(bsSolana.validateKey(invalidKey)).toBeFalsy()
    expect(bsSolana.validateKey(anotherInvalidKey)).toBeFalsy()
  })

  it('Should be able to generate a account from mnemonic', () => {
    const generatedAccount = bsSolana.generateAccountFromMnemonic(mnemonic, 0)

    expect(generatedAccount.address).toEqual(accountKeypair.base58Address)
    expect(generatedAccount.key).toEqual(accountKeypair.base58Key)
  })

  it('Should be able to generate a account from key', () => {
    const generatedAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    expect(generatedAccount.address).toEqual(accountKeypair.base58Address)
    expect(generatedAccount.key).toEqual(accountKeypair.base58Key)
  })

  it('Should be able to generate a account from buffer key', () => {
    const generatedAccount = bsSolana.generateAccountFromKey(accountKeypair.bufferKey)

    expect(generatedAccount.address).toEqual(accountKeypair.base58Address)
    expect(generatedAccount.key).toEqual(accountKeypair.base58Key)
  })

  it('Should be able to test the network', () => {
    expect(() => bsSolana.testNetwork(network)).not.toThrowError()
  })

  it('Should be able to calculate transfer fee of the native token', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: accountKeypair.base58Address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it('Should be able to calculate transfer fee of a SPL token', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: accountKeypair.base58Address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it('Should be able to calculate transfer fee for more than one intent', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)

    const fee = await bsSolana.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: accountKeypair.base58Address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
        {
          amount: '0.1',
          receiverAddress: accountKeypair.base58Address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer the native token', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer a SPL token', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = bsSolana.generateAccountFromMnemonic(mnemonic, 1)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer more than one intent', async () => {
    const senderAccount = bsSolana.generateAccountFromKey(accountKeypair.base58Key)
    const receiverAccount = bsSolana.generateAccountFromMnemonic(mnemonic, 2)

    const [transactionHash] = await bsSolana.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  it('Should be able to validate an domain', () => {
    const validDomain = 'bonfida.sol'
    const invalidDomain = 'invalid domain'

    expect(bsSolana.validateNameServiceDomainFormat(validDomain)).toBeTruthy()
    expect(bsSolana.validateNameServiceDomainFormat(invalidDomain)).toBeFalsy()
  })

  it.skip('Should be able to resolve a name service domain', async () => {
    const newBSSolana = new BSSolana('solana', keys, BSSolanaConstants.MAINNET_NETWORKS[0])
    const address = await newBSSolana.resolveNameServiceDomain('bonfida.sol')
    expect(address).toEqual('HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA')
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to calculate transfer fee for more than one intent using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('solana', keys, network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const fee = await service.calculateTransferFee({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(fee).toEqual(expect.any(String))
  }, 50000)

  it.skip('Should be able to transfer the native token using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('solana', keys, network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer a SPL token using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('solana', keys, network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)

  // Use https://spl-token-faucet.com/ to get some tokens to test this
  it.skip('Should be able to transfer more than one intent using ledger', async () => {
    const transport = await TransportNodeHid.create()
    const service = new BSSolana('solana', keys, network, async () => transport)
    const senderAccount = await service.ledgerService.getAccount(transport, 0)
    const receiverAccount = await service.ledgerService.getAccount(transport, 1)

    const [transactionHash] = await service.transfer({
      senderAccount,
      intents: [
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 9,
          tokenHash: '-',
        },
        {
          amount: '0.1',
          receiverAddress: receiverAccount.address,
          tokenDecimals: 6,
          tokenHash: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        },
      ],
    })

    expect(transactionHash).toEqual(expect.any(String))
  }, 50000)
})
