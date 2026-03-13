import { BSNeoX } from '../BSNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import type { TBSNetwork } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import type { TBSNeoXNetworkId } from '../types'
import { BSNeoXHelper } from '../helpers/BSNeoXHelper'

const antiMevTestnetUrls = BSNeoXConstants.ANTI_MEV_RPC_LIST_BY_NETWORK_ID[BSNeoXConstants.TESTNET_NETWORK.id]

const testnetNetwork: TBSNetwork<TBSNeoXNetworkId> = {
  ...BSNeoXConstants.TESTNET_NETWORK,
  url: BSNeoXConstants.RPC_LIST_BY_NETWORK_ID[BSNeoXConstants.TESTNET_NETWORK.id].find(
    url => !antiMevTestnetUrls.includes(url)
  )!,
}

const antiMevTestnetNetwork: TBSNetwork<TBSNeoXNetworkId> = {
  ...BSNeoXConstants.TESTNET_NETWORK,
  url: antiMevTestnetUrls[0],
}

const neoToken = BSNeoXHelper.getNeoToken(testnetNetwork)

describe('BSNeoX', () => {
  let bsNeoX: BSNeoX<'test'>

  it('Should be able to transfer the native token (GAS) on Testnet', async () => {
    bsNeoX = new BSNeoX('test', testnetNetwork)

    const senderAccount = await bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const firstAmount = '0.00000044'
    const secondAmount = '0.0000008'
    const token = BSNeoXConstants.NATIVE_ASSET

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: address,
          token,
        },
        {
          amount: secondAmount,
          receiverAddress: address,
          token,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: firstAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: secondAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  })

  it('Should be able to transfer the NEO token on Testnet', async () => {
    bsNeoX = new BSNeoX('test', testnetNetwork)

    const senderAccount = await bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.1'

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer the native token (GAS) on Testnet using Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', testnetNetwork, async () => transport)

    const senderAccount = await bsNeoX.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const firstAmount = '0.00000005'
    const secondAmount = '0.00000006'
    const token = BSNeoXConstants.NATIVE_ASSET

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: address,
          token,
        },
        {
          amount: secondAmount,
          receiverAddress: address,
          token,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: firstAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: secondAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  }, 120000)

  it.skip('Should be able to transfer the NEO token on Testnet using Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', testnetNetwork, async () => transport)

    const senderAccount = await bsNeoX.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const amount = '0.1'

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  }, 120000)

  it('Should be able to transfer the native token (GAS) on Testnet using Anti-MEV', async () => {
    bsNeoX = new BSNeoX('test', antiMevTestnetNetwork)

    const senderAccount = await bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const firstAmount = '0.00000044'
    const secondAmount = '0.0000008'
    const token = BSNeoXConstants.NATIVE_ASSET

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: address,
          token,
        },
        {
          amount: secondAmount,
          receiverAddress: address,
          token,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: firstAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: secondAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  })

  it('Should be able to transfer the NEO token on Testnet using Anti-MEV', async () => {
    bsNeoX = new BSNeoX('test', antiMevTestnetNetwork)

    const senderAccount = await bsNeoX.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    const { address } = senderAccount
    const amount = '0.1'

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  })

  it.skip('Should be able to transfer the native token (GAS) on Testnet using Anti-MEV and Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', antiMevTestnetNetwork, async () => transport)

    const senderAccount = await bsNeoX.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const firstAmount = '0.00000005'
    const secondAmount = '0.00000006'
    const token = BSNeoXConstants.NATIVE_ASSET

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount: firstAmount,
          receiverAddress: address,
          token,
        },
        {
          amount: secondAmount,
          receiverAddress: address,
          token,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: firstAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount: secondAmount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'native',
            tokenUrl: undefined,
            token,
          },
        ],
      },
    ])
  }, 120000)

  it.skip('Should be able to transfer the NEO token on Testnet using Anti-MEV and Ledger', async () => {
    const transport = await TransportNodeHid.create()

    bsNeoX = new BSNeoX('test', antiMevTestnetNetwork, async () => transport)

    const senderAccount = await bsNeoX.ledgerService.getAccount(transport, 0)
    const { address } = senderAccount
    const amount = '0.1'

    const transactions = await bsNeoX.transfer({
      senderAccount,
      intents: [
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
        {
          amount,
          receiverAddress: address,
          token: neoToken,
        },
      ],
    })

    await transport.close()

    expect(transactions).toEqual([
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
      {
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        date: expect.any(String),
        networkFeeAmount: expect.any(String),
        type: 'default',
        view: 'default',
        events: [
          {
            eventType: 'token',
            amount,
            methodName: 'transfer',
            from: address,
            fromUrl: expect.any(String),
            to: address,
            toUrl: expect.any(String),
            tokenType: 'erc-20',
            tokenUrl: expect.any(String),
            token: neoToken,
          },
        ],
      },
    ])
  }, 120000)
})
