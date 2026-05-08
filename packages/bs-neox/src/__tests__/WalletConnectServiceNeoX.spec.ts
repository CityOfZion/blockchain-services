import { type TBSAccount, type TBSNetwork } from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSNeoX } from '../BSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { WalletConnectServiceNeoX } from '../services/wallet-connect/WalletConnectServiceNeoX'
import type { TBSNeoXName, TBSNeoXNetworkId } from '../types'

const network = BSNeoXConstants.TESTNET_NETWORK
let service: BSNeoX
let walletConnectService: WalletConnectServiceNeoX
let account: TBSAccount<TBSNeoXName>

describe('WalletConnectServiceNeoX', () => {
  beforeEach(async () => {
    service = new BSNeoX(network)
    walletConnectService = new WalletConnectServiceNeoX(service)

    const wallet = ethers.Wallet.createRandom()

    account = {
      key: wallet.privateKey,
      type: 'privateKey',
      address: wallet.address,
      blockchain: 'neox',
    }
  })

  it('Should be able to validate eth_getTransactionCount params', async () => {
    await expect(walletConnectService.handlers.eth_getTransactionCount.validate(undefined)).resolves.not.toThrow()
  })

  it('Should be able to process eth_getTransactionCount', async () => {
    const count = await walletConnectService.handlers.eth_getTransactionCount.process({
      account,
      method: 'eth_getTransactionCount',
      params: undefined,
    })

    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it("Shouldn't be able to validate eth_getCachedTransaction with invalid params", async () => {
    await expect(walletConnectService.handlers.eth_getCachedTransaction.validate({})).rejects.toThrow()
    await expect(walletConnectService.handlers.eth_getCachedTransaction.validate(['only-one'])).rejects.toThrow()
    await expect(walletConnectService.handlers.eth_getCachedTransaction.validate([123, 'sig'])).rejects.toThrow()
  })

  it('Should be able to validate eth_getCachedTransaction params', async () => {
    const validParams = ['0x1', '0xsignature']
    const result = await walletConnectService.handlers.eth_getCachedTransaction.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to process eth_getCachedTransaction', async () => {
    // Requires a transaction previously cached on the Anti-MEV RPC via eth_sendTransaction
    const accountWithFunds = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const nonce = await walletConnectService.handlers.eth_getTransactionCount.process({
      account: accountWithFunds,
      method: 'eth_getTransactionCount',
      params: undefined,
    })

    expect(nonce).toBeGreaterThanOrEqual(0)

    const result = await walletConnectService.handlers.eth_getCachedTransaction.process({
      account: accountWithFunds,
      method: 'eth_getCachedTransaction',
      params: [nonce.toString(), '0x'],
    })

    expect(result).toBeDefined()
  })

  it("Shouldn't be able to validate eth_sendTransaction with invalid params", async () => {
    await expect(walletConnectService.handlers.eth_sendTransaction.validate([])).rejects.toThrow()
    await expect(walletConnectService.handlers.eth_sendTransaction.validate('invalid')).rejects.toThrow()
  })

  it('Should be able to validate eth_sendTransaction params', async () => {
    const validParams = [{ to: '0xD81a8F3c3f8b006Ef1ae4a2Fd28699AD7E3e21C5', value: '0x0', gas: '0x5208' }]
    const result = await walletConnectService.handlers.eth_sendTransaction.validate(validParams)
    expect(result).toBeDefined()
  })

  it.skip('Should be able to process eth_sendTransaction', async () => {
    const antiMevTestnetUrls = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[network.id]

    const testnetNetwork: TBSNetwork<TBSNeoXNetworkId> = {
      ...network,
      url: BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[network.id].find(url => !antiMevTestnetUrls.includes(url))!,
    }

    service = new BSNeoX(testnetNetwork)
    walletConnectService = new WalletConnectServiceNeoX(service)

    // Requires a funded account on NeoX Testnet
    const accountWithFunds = await service.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const txHash = await walletConnectService.handlers.eth_sendTransaction.process({
      account: accountWithFunds,
      method: 'eth_sendTransaction',
      params: [{ to: accountWithFunds.address, value: '0x0', gas: '0x5208' }],
    })

    expect(txHash).toMatch(/^0x/)
  })
})
