import {
  Account,
  Network,
  SwapControllerServiceSwapToReceiveArgs,
  SwapControllerServiceSwapToUseArgs,
  SwapRoute,
  Token,
} from '@cityofzion/blockchain-service'
import { FlamingoSwapControllerService } from '../../flamingo-swap/FlamingoSwapControllerService'
import { BSNeo3NetworkId } from '../../BSNeo3Helper'
import { FlamingoSwapHelper } from '../../flamingo-swap/FlamingoSwapHelper'

let flamingoSwapControllerService: FlamingoSwapControllerService

const network: Network<BSNeo3NetworkId> = {
  name: 'mainnet',
  id: 'mainnet',
  url: 'https://mainnet1.neo.coz.io:443',
}

const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')
const SWTH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'SWTH')
const FLM = FlamingoSwapHelper.getFlamingoSwapToken(network, 'FLM')
const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')
const fWETH = FlamingoSwapHelper.getFlamingoSwapToken(network, 'fWETH')

const account: Account = {
  address: 'address',
  key: 'key',
  type: 'publicKey',
}

describe('FlamingoSwapControllerService', () => {
  beforeEach(() => {
    flamingoSwapControllerService = new FlamingoSwapControllerService(network)
  })

  it('Should be able to build swap invocation args with type "swapTokenToUse" - GAS to SWTH', async () => {
    const expectedResponse: SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToUse: '1',
      deadline: '10',
      minimumReceived: expect.any(String),
      routePath: [GAS, FLM, SWTH],
      network,
      type: 'swapTokenToUse',
    }

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    await flamingoSwapControllerService.setTokenToReceive(SWTH)
    flamingoSwapControllerService.setAmountToUse('1')
    flamingoSwapControllerService.setDeadline('10')

    const response = flamingoSwapControllerService.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToUse" - NEO to GAS', async () => {
    const expectedResponse: SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToUse: '100',
      deadline: '10',
      minimumReceived: expect.any(String),
      routePath: [NEO, bNEO, GAS],
      network,
      type: 'swapTokenToUse',
    }

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(GAS)
    await flamingoSwapControllerService.setTokenToUse(NEO)
    flamingoSwapControllerService.setAmountToUse('100')
    flamingoSwapControllerService.setDeadline('10')

    const response = flamingoSwapControllerService.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToReceive" - GAS to SWTH', async () => {
    const expectedResponse: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToReceive: '1',
      deadline: '10',
      maximumSelling: expect.any(String),
      routePath: [GAS, FLM, SWTH],
      network,
      type: 'swapTokenToReceive',
    }

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    await flamingoSwapControllerService.setTokenToReceive(SWTH)
    flamingoSwapControllerService.setAmountToReceive('1')
    flamingoSwapControllerService.setDeadline('10')

    const response = flamingoSwapControllerService.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to build swap invocation args with type "swapTokenToReceive" - GAS to NEO', async () => {
    const expectedResponse: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId> = {
      address: account.address,
      amountToReceive: '100',
      deadline: '10',
      maximumSelling: expect.any(String),
      routePath: [GAS, bNEO, NEO],
      network,
      type: 'swapTokenToReceive',
    }

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(NEO)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    flamingoSwapControllerService.setAmountToReceive('100')
    flamingoSwapControllerService.setDeadline('10')

    const response = flamingoSwapControllerService.buildSwapInvocationArgs()
    expect(response).toEqual(expectedResponse)
  })

  it('Should be able to listen to route changes - GAS to NEO', async () => {
    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: bNEO,
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: NEO,
        reserveTokenToReceive: expect.any(String),
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapControllerService.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    await flamingoSwapControllerService.setTokenToReceive(NEO)

    expect(route).toEqual(expectedRoute)
  })

  it('Should be able to listen to account changes', async () => {
    let accountToUse: Account | null = null

    flamingoSwapControllerService.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapControllerService.setAccountToUse(account)

    expect(accountToUse).toEqual(account)
  })

  it('Should be able to listen to tokenToUse changes', async () => {
    let tokenToUse: Token | null = null

    flamingoSwapControllerService.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)

    expect(tokenToUse).toEqual(GAS)
  })

  it('Should be able to listen to tokenToReceive changes', async () => {
    let tokenToReceive: Token | null = null

    flamingoSwapControllerService.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(SWTH)

    expect(tokenToReceive).toEqual(SWTH)
  })

  it('Should be able to listen to route changes - GAS to NEO', async () => {
    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: bNEO,
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '0',
        tokenToReceive: NEO,
        reserveTokenToReceive: '0',
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapControllerService.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(NEO)
    await flamingoSwapControllerService.setTokenToUse(GAS)

    expect(route).toEqual(expectedRoute)
  })

  it.only('Should be able to listen events - GAS to NEO', async () => {
    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: GAS,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: bNEO,
        reserveTokenToReceive: expect.any(String),
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: '0',
        tokenToReceive: NEO,
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

    flamingoSwapControllerService.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapControllerService.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapControllerService.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapControllerService.eventEmitter.on('slippage', item => {
      slippage = item
    })

    flamingoSwapControllerService.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(NEO)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    flamingoSwapControllerService.setAmountToReceive('1')
    flamingoSwapControllerService.setDeadline('10')
    flamingoSwapControllerService.setSlippage(0.5)

    expect(route).toEqual(expectedRoute)
    expect(accountToUse).toEqual(account)
    expect(tokenToUse).toEqual(GAS)
    expect(tokenToReceive).toEqual(NEO)
    expect(deadline).toEqual('10')
    expect(slippage).toEqual(0.5)
    expect(amountToReceive).toEqual('1')
    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen events - NEO to GAS', async () => {
    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: NEO,
        reserveTokenToUse: '0',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: GAS,
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

    flamingoSwapControllerService.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapControllerService.eventEmitter.on('accountToUse', item => {
      accountToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('tokenToUse', item => {
      tokenToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('tokenToReceive', item => {
      tokenToReceive = item
    })

    flamingoSwapControllerService.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapControllerService.eventEmitter.on('slippage', item => {
      slippage = item
    })

    flamingoSwapControllerService.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapControllerService.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToReceive(GAS)
    await flamingoSwapControllerService.setTokenToUse(NEO)
    flamingoSwapControllerService.setAmountToUse('1')
    flamingoSwapControllerService.setDeadline('10')
    flamingoSwapControllerService.setSlippage(0.5)

    expect(route).toEqual(expectedRoute)
    expect(accountToUse).toEqual(account)
    expect(tokenToUse).toEqual(NEO)
    expect(tokenToReceive).toEqual(GAS)
    expect(deadline).toEqual('10')
    expect(slippage).toEqual(0.5)
    expect(amountToUse).toEqual('1')
    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to route changes - NEO to GAS', async () => {
    const expectedRoute: SwapRoute[] = [
      {
        tokenToUse: NEO,
        reserveTokenToUse: '0',
        tokenToReceive: bNEO,
        reserveTokenToReceive: '0',
      },
      {
        tokenToUse: bNEO,
        reserveTokenToUse: expect.any(String),
        tokenToReceive: GAS,
        reserveTokenToReceive: expect.any(String),
      },
    ]

    let route: SwapRoute[] | null = null

    flamingoSwapControllerService.eventEmitter.on('route', item => {
      route = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(NEO)
    await flamingoSwapControllerService.setTokenToReceive(GAS)

    expect(route).toEqual(expectedRoute)
  })

  it('Should be able to listen to amountToUse changes - FLM to fWETH', async () => {
    let amountToUse: string | null = null

    flamingoSwapControllerService.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(FLM)
    await flamingoSwapControllerService.setTokenToReceive(fWETH)
    flamingoSwapControllerService.setAmountToReceive('1')

    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen to amountToUse changes - GAS to NEO', async () => {
    let amountToUse: string | null = null

    flamingoSwapControllerService.eventEmitter.on('amountToUse', item => {
      amountToUse = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    await flamingoSwapControllerService.setTokenToReceive(NEO)
    flamingoSwapControllerService.setAmountToReceive('1')

    expect(amountToUse).toBeDefined()
  })

  it('Should be able to listen to amountToReceive changes - FLM to fWETH', async () => {
    let amountToReceive: string | null = null

    flamingoSwapControllerService.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(FLM)
    await flamingoSwapControllerService.setTokenToReceive(fWETH)
    flamingoSwapControllerService.setAmountToReceive('1')

    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to amountToReceive changes - NEO to GAS', async () => {
    let amountToReceive: string | null = null

    flamingoSwapControllerService.eventEmitter.on('amountToReceive', item => {
      amountToReceive = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(NEO)
    await flamingoSwapControllerService.setTokenToReceive(GAS)
    flamingoSwapControllerService.setAmountToUse('100')

    expect(amountToReceive).toBeDefined()
  })

  it('Should be able to listen to deadline changes', async () => {
    let deadline: string | null = null

    flamingoSwapControllerService.eventEmitter.on('deadline', item => {
      deadline = item
    })

    flamingoSwapControllerService.setAccountToUse(account)
    await flamingoSwapControllerService.setTokenToUse(GAS)
    await flamingoSwapControllerService.setTokenToReceive(SWTH)
    flamingoSwapControllerService.setDeadline('10')

    expect(deadline).toEqual('10')
  })
})
