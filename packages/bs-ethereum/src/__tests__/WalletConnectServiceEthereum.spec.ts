import { BSError, type TBSAccount } from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSEthereum } from '../BSEthereum'
import { WalletConnectServiceEthereum } from '../services/wallet-connect/WalletConnectServiceEthereum'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import type { TBSEthereumNetworkId } from '../types'

let service: BSEthereum<'ethereum'>
let walletConnectService: WalletConnectServiceEthereum<'ethereum', TBSEthereumNetworkId>
let account: TBSAccount<'ethereum'>

describe('WalletConnectServiceEthereum', () => {
  beforeEach(async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.ethereum.find(network => network.type === 'testnet')!

    service = new BSEthereum('ethereum', network)
    walletConnectService = new WalletConnectServiceEthereum(service)

    const wallet = ethers.Wallet.createRandom()
    account = {
      key: wallet.privateKey,
      type: 'privateKey',
      address: wallet.address,
      blockchain: 'ethereum',
    }
  })

  it('Should have correct namespace and chain', () => {
    expect(walletConnectService.namespace).toBe('eip155')
    expect(walletConnectService.chain).toBe(`eip155:${service.network.id}`)
  })

  it('Should have supported methods', () => {
    expect(walletConnectService.supportedMethods).toContain('personal_sign')
    expect(walletConnectService.supportedMethods).toContain('eth_sign')
    expect(walletConnectService.supportedMethods).toContain('eth_signTransaction')
    expect(walletConnectService.supportedMethods).toContain('eth_signTypedData')
    expect(walletConnectService.supportedMethods).toContain('eth_signTypedData_v3')
    expect(walletConnectService.supportedMethods).toContain('eth_signTypedData_v4')
    expect(walletConnectService.supportedMethods).toContain('eth_sendTransaction')
    expect(walletConnectService.supportedMethods).toContain('eth_call')
    expect(walletConnectService.supportedMethods).toContain('eth_requestAccounts')
    expect(walletConnectService.supportedMethods).toContain('eth_sendRawTransaction')
  })

  it('Should have calculable methods', () => {
    expect(walletConnectService.calculableMethods).toContain('eth_sendTransaction')
    expect(walletConnectService.calculableMethods).toContain('eth_sendRawTransaction')
  })

  it('Should have auto approve methods', () => {
    expect(walletConnectService.autoApproveMethods).toContain('eth_requestAccounts')
    expect(walletConnectService.autoApproveMethods).toContain('eth_addEthereumChain')
    expect(walletConnectService.autoApproveMethods).toContain('eth_switchEthereumChain')
    expect(walletConnectService.autoApproveMethods).toContain('wallet_switchEthereumChain')
    expect(walletConnectService.autoApproveMethods).toContain('wallet_getPermissions')
    expect(walletConnectService.autoApproveMethods).toContain('wallet_requestPermissions')
    expect(walletConnectService.autoApproveMethods).toContain('wallet_addEthereumChain')
    expect(walletConnectService.autoApproveMethods).toContain('eth_call')
  })

  it('Should have supported events', () => {
    expect(walletConnectService.supportedEvents).toEqual(['chainChanged', 'accountsChanged', 'disconnect', 'connect'])
  })

  it("Shouldn't be able to validate personal_sign with invalid params", async () => {
    await expect(walletConnectService.handlers.personal_sign.validate([123, 456])).rejects.toThrow()
    await expect(walletConnectService.handlers.personal_sign.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.personal_sign.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate personal_sign params', async () => {
    const validParams = ['0x48656c6c6f', '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5']
    const result = await walletConnectService.handlers.personal_sign.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to sign a message with personal_sign', async () => {
    const message = '0x48656c6c6f' // "Hello" in hex

    const result = await walletConnectService.handlers.personal_sign.process({
      account,
      method: 'personal_sign',
      params: [message, account.address],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to sign a non-hex message with personal_sign', async () => {
    const message = 'Hello, World!'

    const result = await walletConnectService.handlers.personal_sign.process({
      account,
      method: 'personal_sign',
      params: [message, account.address],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to sign a message with personal_sign using mnemonic account', async () => {
    const wallet = ethers.Wallet.createRandom()
    const mnemonicPhrase = wallet.mnemonic.phrase
    const accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonicPhrase, 0)
    const message = 'Hello, World!'

    const result = await walletConnectService.handlers.personal_sign.process({
      account: accountFromMnemonic,
      method: 'personal_sign',
      params: [message, accountFromMnemonic.address],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to sign a message with eth_sign', async () => {
    const message = 'Hello, World!'

    const result = await walletConnectService.handlers.eth_sign.process({
      account,
      method: 'eth_sign',
      params: [message, account.address],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to validate eth_signTypedData params', async () => {
    const typedData = {
      primaryType: 'Mail',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
        ],
        Mail: [
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
          { name: 'contents', type: 'string' },
        ],
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
      },
      message: {
        from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        to: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        contents: 'Hello, Bob!',
      },
    }

    const validParams = [account.address, typedData]
    const result = await walletConnectService.handlers.eth_signTypedData.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate eth_signTypedData with JSON stringified params', async () => {
    const typedData = JSON.stringify({
      primaryType: 'Mail',
      types: {
        Mail: [
          { name: 'from', type: 'string' },
          { name: 'contents', type: 'string' },
        ],
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
      },
      message: {
        from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        contents: 'Hello!',
      },
    })

    const validParams = [account.address, typedData]
    const result = await walletConnectService.handlers.eth_signTypedData.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to sign typed data with eth_signTypedData_v4', async () => {
    const typedData = {
      primaryType: 'Mail',
      types: {
        Mail: [
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
          { name: 'contents', type: 'string' },
        ],
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
      },
      message: {
        from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        to: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        contents: 'Hello, Bob!',
      },
    }

    const result = await walletConnectService.handlers.eth_signTypedData_v4.process({
      account,
      method: 'eth_signTypedData_v4',
      params: [account.address, typedData],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it("Shouldn't be able to validate eth_signTransaction with invalid params", async () => {
    await expect(walletConnectService.handlers.eth_signTransaction.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.eth_signTransaction.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate eth_signTransaction params', async () => {
    const validParams = [
      {
        to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        value: '0x0',
        data: '0x',
        gas: '0x5208',
      },
    ]

    const result = await walletConnectService.handlers.eth_signTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate eth_signTransaction params with all optional fields', async () => {
    const validParams = [
      {
        to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        value: '0x0',
        data: '0x',
        gas: '0x5208',
        gasLimit: '0x5208',
        maxPriorityFeePerGas: '0x3B9ACA00',
        maxFeePerGas: '0x77359400',
        nonce: 0,
        chainId: 11155111,
        type: 2,
        gasPrice: '0x3B9ACA00',
      },
    ]
    const result = await walletConnectService.handlers.eth_signTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate eth_signTransaction params with numeric values', async () => {
    const validParams = [
      {
        to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5',
        value: 0,
        gas: 21000,
        chainId: '0xaa36a7',
      },
    ]
    const result = await walletConnectService.handlers.eth_signTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to validate eth_signTransaction params without a to address (contract deployment)', async () => {
    const validParams = [{ data: '0x6080604052', gas: '0x76c0' }]
    const result = await walletConnectService.handlers.eth_signTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it('Should be able to process eth_signTransaction (legacy) with explicit gasPrice', async () => {
    const result = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [
        {
          to: account.address,
          value: '0x0',
          nonce: 0,
          gas: '0x5208',
          gasPrice: '0x3B9ACA00',
          chainId: parseInt(service.network.id),
          type: 0,
        },
      ],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to process eth_signTransaction (legacy) without explicit gasPrice (fetched from RPC)', async () => {
    const result = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [
        {
          to: account.address,
          value: '0x0',
          nonce: 0,
          gas: '0x5208',
          chainId: parseInt(service.network.id),
          type: 0,
        },
      ],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to process eth_signTransaction (EIP-1559)', async () => {
    const result = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [
        {
          to: account.address,
          value: '0x0',
          nonce: 0,
          gas: '0x5208',
          chainId: parseInt(service.network.id),
          type: 2,
          maxPriorityFeePerGas: '0x3B9ACA00',
          maxFeePerGas: '0x77359400',
        },
      ],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to process eth_signTransaction with data payload', async () => {
    const result = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [
        {
          to: account.address,
          value: '0x0',
          data: '0xdeadbeef',
          nonce: 0,
          gasLimit: '0x10000',
          gasPrice: '0x3B9ACA00',
          chainId: parseInt(service.network.id),
          type: 0,
        },
      ],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should be able to process eth_signTransaction for contract deployment (no to)', async () => {
    const result = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [
        {
          data: '0x6080604052',
          nonce: 0,
          gasLimit: '0x76c0',
          gasPrice: '0x3B9ACA00',
          chainId: parseInt(service.network.id),
          type: 0,
        },
      ],
    })

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^0x/)
  })

  it('Should produce a deterministic signature for the same inputs in eth_signTransaction', async () => {
    const param = {
      to: account.address,
      value: '0x0',
      nonce: 0,
      gasLimit: '0x5208',
      chainId: parseInt(service.network.id),
      type: 0,
      gasPrice: '0x3B9ACA00',
    }

    const result1 = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [param],
    })

    const result2 = await walletConnectService.handlers.eth_signTransaction.process({
      account,
      method: 'eth_signTransaction',
      params: [param],
    })

    expect(result1).toBe(result2)
  })

  it("Shouldn't be able to calculate request fee with invalid params for eth_sendTransaction", async () => {
    await expect(
      walletConnectService.calculateRequestFee({
        account,
        method: 'eth_sendTransaction',
        params: 'invalid',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_PARAMS')

      return true
    })
  })

  it("Shouldn't be able to validate eth_sendRawTransaction with invalid params", async () => {
    await expect(walletConnectService.handlers.eth_sendRawTransaction.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.eth_sendRawTransaction.validate([123])).rejects.toThrow()
  })

  it('Should be able to validate eth_sendRawTransaction params', async () => {
    const validParams = ['0xf86c808504a817c80082520894...']
    const result = await walletConnectService.handlers.eth_sendRawTransaction.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it("Shouldn't be able to calculate request fee with invalid params for eth_sendRawTransaction", async () => {
    await expect(
      walletConnectService.calculateRequestFee({
        account,
        method: 'eth_sendRawTransaction',
        params: 'invalid',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_PARAMS')

      return true
    })
  })

  it("Shouldn't be able to calculate request fee with unsupported method", async () => {
    await expect(
      walletConnectService.calculateRequestFee({
        account,
        method: 'personal_sign',
        params: ['0x48656c6c6f', account.address],
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('UNSUPPORTED_METHOD')

      return true
    })
  })

  it('Should be able to request accounts with eth_requestAccounts', async () => {
    const result = await walletConnectService.handlers.eth_requestAccounts.process({
      account,
      method: 'eth_requestAccounts',
      params: undefined,
    })

    expect(result).toEqual([account.address])
  })

  it('Should return null for eth_switchEthereumChain', async () => {
    const result = await walletConnectService.handlers.eth_switchEthereumChain.process({
      account,
      method: 'eth_switchEthereumChain',
      params: undefined,
    })

    expect(result).toBe('null')
  })

  it('Should return null for eth_addEthereumChain', async () => {
    const result = await walletConnectService.handlers.eth_addEthereumChain.process({
      account,
      method: 'eth_addEthereumChain',
      params: undefined,
    })

    expect(result).toBe('null')
  })

  it('Should return null for wallet_switchEthereumChain', async () => {
    const result = await walletConnectService.handlers.wallet_switchEthereumChain.process({
      account,
      method: 'wallet_switchEthereumChain',
      params: undefined,
    })

    expect(result).toBe('null')
  })

  it('Should return null for wallet_addEthereumChain', async () => {
    const result = await walletConnectService.handlers.wallet_addEthereumChain.process({
      account,
      method: 'wallet_addEthereumChain',
      params: undefined,
    })

    expect(result).toBe('null')
  })

  it('Should return empty array for wallet_getPermissions', async () => {
    const result = await walletConnectService.handlers.wallet_getPermissions.process({
      account,
      method: 'wallet_getPermissions',
      params: undefined,
    })

    expect(result).toEqual([])
  })

  it('Should return empty array for wallet_requestPermissions', async () => {
    const result = await walletConnectService.handlers.wallet_requestPermissions.process({
      account,
      method: 'wallet_requestPermissions',
      params: undefined,
    })

    expect(result).toEqual([])
  })
})
