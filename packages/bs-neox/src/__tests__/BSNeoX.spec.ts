import { BSNeoX } from '../BSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { BSUtilsHelper, TBSNetwork } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { TBSNeoXNetworkId } from '../types'

const defaultNetwork: TBSNetwork<TBSNeoXNetworkId> = {
  ...BSNeoXConstants.TESTNET_NETWORK,
  url: BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[BSNeoXConstants.TESTNET_NETWORK.id].find(
    url => !BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[BSNeoXConstants.TESTNET_NETWORK.id].includes(url)
  )!,
}

const antiMevNetwork: TBSNetwork<TBSNeoXNetworkId> = {
  ...BSNeoXConstants.TESTNET_NETWORK,
  url: BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[BSNeoXConstants.TESTNET_NETWORK.id][0],
}

const neoTokenTestNet = { hash: '0xab0a26b8d903f36acb4bf9663f8d2de0672433cd', decimals: 18 }

describe('BSNeoX', () => {
  let bsNeoX: BSNeoX<'test'>

  it('Should be able to transfer the native token (GAS) on TestNet', async () => {
    bsNeoX = new BSNeoX('test', defaultNetwork)

    const account = bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000044',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
        {
          amount: '0.0000008',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)
  })

  it('Should be able to transfer the NEO token on TestNet', async () => {
    bsNeoX = new BSNeoX('test', defaultNetwork)

    const account = bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)
  })

  it.skip('Should be able to transfer the native token (GAS) on TestNet using Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', defaultNetwork, async () => transport)

    const account = await bsNeoX.ledgerService.getAccount(transport, 0)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000005',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
        {
          amount: '0.00000006',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)

    await transport.close()
  }, 120000)

  it.skip('Should be able to transfer the NEO token on TestNet using Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', defaultNetwork, async () => transport)

    const account = await bsNeoX.ledgerService.getAccount(transport, 0)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)

    await transport.close()
  }, 120000)

  it('Should be able to transfer the native token (GAS) on TestNet using Anti-MEV', async () => {
    // To wait the updated nonce
    await BSUtilsHelper.wait(30000)

    bsNeoX = new BSNeoX('test', antiMevNetwork)

    const account = bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000044',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
        {
          amount: '0.0000008',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)
  })

  it('Should be able to transfer the NEO token on TestNet using Anti-MEV', async () => {
    // To wait the updated nonce
    await BSUtilsHelper.wait(30000)

    bsNeoX = new BSNeoX('test', antiMevNetwork)

    const account = bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)
  })

  it.skip('Should be able to transfer the native token (GAS) on TestNet using Anti-MEV and Ledger', async () => {
    // To wait the updated nonce
    await BSUtilsHelper.wait(30000)

    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', antiMevNetwork, async () => transport)

    const account = await bsNeoX.ledgerService.getAccount(transport, 0)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.00000005',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
        {
          amount: '0.00000006',
          receiverAddress: account.address,
          tokenDecimals: BSNeoXConstants.NATIVE_ASSET.decimals,
          tokenHash: BSNeoXConstants.NATIVE_ASSET.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)

    await transport.close()
  }, 120000)

  it.skip('Should be able to transfer the NEO token on TestNet using Anti-MEV and Ledger', async () => {
    // To wait the updated nonce
    await BSUtilsHelper.wait(30000)

    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', antiMevNetwork, async () => transport)

    const account = await bsNeoX.ledgerService.getAccount(transport, 0)

    const transactionHashes = await bsNeoX.transfer({
      senderAccount: account,
      intents: [
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
        {
          amount: '0.1',
          receiverAddress: account.address,
          tokenDecimals: neoTokenTestNet.decimals,
          tokenHash: neoTokenTestNet.hash,
        },
      ],
    })

    expect(transactionHashes).toEqual(expect.arrayOf(expect.any(String)))
    expect(transactionHashes.length).toBe(2)

    await transport.close()
  }, 120000)
})
