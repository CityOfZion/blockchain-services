import {
  Account,
  Network,
  SwapRoute,
  SwapServiceSwapToReceiveArgs,
  SwapServiceSwapToUseArgs,
  Token,
} from '@cityofzion/blockchain-service'
import { BSNeo3 } from '../../../BSNeo3'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../../constants/BSNeo3Constants'
import { FlamingoSwapConstants } from '../../../constants/FlamingoSwapConstants'
import { FlamingoSwapServiceNeo3 } from '../../../services/swap/FlamingoSwapServiceNeo3'

let flamingoSwapServiceNeo3: FlamingoSwapServiceNeo3
let network: Network<BSNeo3NetworkId>

describe('FlamingoSwapServiceNeo3', () => {
  beforeEach(() => {
    network = BSNeo3Constants.DEFAULT_NETWORK
    const bsNeo3 = new BSNeo3('neo3', network)
    flamingoSwapServiceNeo3 = new FlamingoSwapServiceNeo3(network, bsNeo3)
  })

  it('Should be able to build swap invocation args with type "swapTokenToUse" - GAS to SWTH', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedResponse: SwapServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToUse: '1',
      deadline: '10',
      minimumReceived: expect.any(String),
      routePath: [
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'],
      ],
      network,
      type: 'swapTokenToUse',
    }

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'])
    flamingoSwapServiceNeo3.setAmountToUse('1')
    flamingoSwapServiceNeo3.setDeadline('10')

    const response = flamingoSwapServiceNeo3.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToUse" - NEO to GAS', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedResponse: SwapServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToUse: '100',
      deadline: '10',
      minimumReceived: expect.any(String),
      routePath: [
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
      ],
      network,
      type: 'swapTokenToUse',
    }

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    flamingoSwapServiceNeo3.setAmountToUse('100')
    flamingoSwapServiceNeo3.setDeadline('10')

    const response = flamingoSwapServiceNeo3.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToReceive" - GAS to SWTH', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedResponse: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToReceive: '1',
      deadline: '10',
      maximumSelling: expect.any(String),
      routePath: [
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'],
      ],
      network,
      type: 'swapTokenToReceive',
    }

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'])
    flamingoSwapServiceNeo3.setAmountToReceive('1')
    flamingoSwapServiceNeo3.setDeadline('10')

    const response = flamingoSwapServiceNeo3.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToReceive" - GAS to NEO', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedResponse: SwapServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToReceive: '100',
      deadline: '10',
      maximumSelling: expect.any(String),
      routePath: [
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
      ],
      network,
      type: 'swapTokenToReceive',
    }

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    flamingoSwapServiceNeo3.setAmountToReceive('100')
    flamingoSwapServiceNeo3.setDeadline('10')

    const response = flamingoSwapServiceNeo3.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to listen to route changes - GAS to NEO', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToReceive: expect.any(String),
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])

    expect(route).toEqual(expectedRoute)
  })

  it('Should be able to listen to account changes', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let accountToUse: Account | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)

    expect(accountToUse).toEqual(account)
  })

  it('Should be able to listen to tokenToUse changes', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let tokenToUse: Token | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])

    expect(tokenToUse).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
  })

  it('Should be able to listen to tokenToReceive changes', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let tokenToReceive: Token | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'])

    expect(tokenToReceive).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'])
  })

  it('Should be able to listen to route changes - GAS to NEO', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToReceive: '0',
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])

    expect(route).toEqual(expectedRoute)
  })

  it('Should be able to listen events - GAS to NEO', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToReceive: '0',
      },
    ]

    let route: SwapRoute[] | null = null
    let accountToUse: Account | null = null
    let tokenToUse: Token | null = null
    let tokenToReceive: Token | null = null
    let deadline: string | null = null
    let slippage: number | null = null
    let amountToUse: string | null = null
    let amountToReceive: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('slippage', item => {
      slippage = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    flamingoSwapServiceNeo3.setAmountToReceive('1')
    flamingoSwapServiceNeo3.setDeadline('10')
    flamingoSwapServiceNeo3.setSlippage(0.5)

    expect(route).toEqual(expectedRoute)
    expect(accountToUse).toEqual(account)
    expect(tokenToUse).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    expect(tokenToReceive).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    expect(deadline).toEqual('10')
    expect(slippage).toEqual(0.5)
    expect(amountToReceive).toEqual('1')
    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen events - NEO to GAS', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToReceive: expect.any(String),
      },
    ]

    let route: SwapRoute[] | null = null
    let accountToUse: Account | null = null
    let tokenToUse: Token | null = null
    let tokenToReceive: Token | null = null
    let deadline: string | null = null
    let slippage: number | null = null
    let amountToUse: string | null = null
    let amountToReceive: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('slippage', item => {
      slippage = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapServiceNeo3.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    flamingoSwapServiceNeo3.setAmountToUse('1')
    flamingoSwapServiceNeo3.setDeadline('10')
    flamingoSwapServiceNeo3.setSlippage(0.5)

    expect(route).toEqual(expectedRoute)
    expect(accountToUse).toEqual(account)
    expect(tokenToUse).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    expect(tokenToReceive).toEqual(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    expect(deadline).toEqual('10')
    expect(slippage).toEqual(0.5)
    expect(amountToUse).toEqual('1')
    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to route changes - NEO to GAS', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'],
        reserveTokenToUse: '0',
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['bNEO'],
        reserveTokenToUse: expect.any(String),
        tokenToReceive: FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'],
        reserveTokenToReceive: expect.any(String),
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])

    expect(route).toEqual(expectedRoute)
  })

  it('Should be able to listen to amountToUse changes - FLM to fWETH', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let amountToUse: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['fWETH'])
    flamingoSwapServiceNeo3.setAmountToReceive('1')

    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen to amountToUse changes - GAS to NEO', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let amountToUse: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    flamingoSwapServiceNeo3.setAmountToReceive('1')

    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen to amountToReceive changes - FLM to fWETH', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let amountToReceive: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['FLM'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['fWETH'])
    flamingoSwapServiceNeo3.setAmountToReceive('1')

    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to amountToReceive changes - NEO to GAS', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let amountToReceive: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['NEO'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    flamingoSwapServiceNeo3.setAmountToUse('100')

    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to deadline changes', async () => {
    const account: Account = {
      address: 'address',
      key: 'key',
      type: 'publicKey',
    }

    let deadline: string | null = null

    flamingoSwapServiceNeo3.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapServiceNeo3.setAccountToUse(account)
    await flamingoSwapServiceNeo3.setTokenToUse(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['GAS'])
    await flamingoSwapServiceNeo3.setTokenToReceive(FlamingoSwapConstants.FLAMINGO_SWAP_TOKENS[network.id]['SWTH'])
    flamingoSwapServiceNeo3.setDeadline('10')

    expect(deadline).toEqual('10')
  })
})
