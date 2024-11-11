import {
  Account,
  SwapServiceLoadableValue,
  SwapServiceMinMaxAmount,
  SwapServiceToken,
  SwapServiceValidateValue,
} from '@cityofzion/blockchain-service'
import { SimpleSwapService } from '../services/SimpleSwapService'
import { BSNeo3 } from '@cityofzion/bs-neo3'

let blockchainServicesByName: Record<'neo3', BSNeo3<'neo3'>>
let simpleSwapService: SimpleSwapService<'neo3'>

let availableTokensToUse: SwapServiceLoadableValue<SwapServiceToken<'neo3'>[]>
let availableTokensToReceive: SwapServiceLoadableValue<SwapServiceToken<'neo3'>[]>
let tokenToUse: SwapServiceLoadableValue<SwapServiceToken<'neo3'>>
let tokenToReceive: SwapServiceLoadableValue<SwapServiceToken<'neo3'>>
let amountToUse: SwapServiceLoadableValue<string>
let amountToUseMinMax: SwapServiceLoadableValue<SwapServiceMinMaxAmount>
let amountToReceive: SwapServiceLoadableValue<string>
let addressToReceive: SwapServiceValidateValue<string>
let accountToUse: SwapServiceValidateValue<Account<'neo3'>>

describe('SimpleSwapService', () => {
  beforeEach(async () => {
    availableTokensToUse = { loading: false, value: null }
    availableTokensToReceive = { loading: false, value: null }
    tokenToUse = { loading: false, value: null }
    tokenToReceive = { loading: false, value: null }
    amountToUse = { loading: false, value: null }
    amountToUseMinMax = { loading: false, value: null }
    amountToReceive = { loading: false, value: null }
    addressToReceive = { loading: false, value: null, valid: null }
    accountToUse = { loading: false, value: null, valid: null }

    blockchainServicesByName = {
      neo3: new BSNeo3('neo3'),
    }

    simpleSwapService = new SimpleSwapService({
      apiKey: process.env.TEST_SIMPLE_SWAP_API_KEY!,
      blockchainServicesByName,
      chainsByServiceName: {
        neo3: ['neo3'],
      },
    })

    simpleSwapService.eventEmitter.on('availableTokensToUse', value => {
      availableTokensToUse = value
    })

    simpleSwapService.eventEmitter.on('availableTokensToReceive', value => {
      availableTokensToReceive = value
    })

    simpleSwapService.eventEmitter.on('tokenToUse', value => {
      tokenToUse = value
    })

    simpleSwapService.eventEmitter.on('tokenToReceive', value => {
      tokenToReceive = value
    })

    simpleSwapService.eventEmitter.on('amountToUse', value => {
      amountToUse = value
    })

    simpleSwapService.eventEmitter.on('amountToUseMinMax', value => {
      amountToUseMinMax = value
    })

    simpleSwapService.eventEmitter.on('amountToReceive', value => {
      amountToReceive = value
    })

    simpleSwapService.eventEmitter.on('addressToReceive', value => {
      addressToReceive = value
    })

    simpleSwapService.eventEmitter.on('accountToUse', value => {
      accountToUse = value
    })
  })

  it('Should not be able to set the token to use if available tokens to use is not set', async () => {
    await expect(simpleSwapService.setTokenToUse(null)).rejects.toThrow('Available tokens to use is not set')
  })

  it("Should not be able to set the token to use if it's not in the available tokens to use", async () => {
    await simpleSwapService.init()
    await expect(
      simpleSwapService.setTokenToUse({ symbol: 'INVALID', blockchain: 'neo3', name: 'INVALID', id: 'INVALID' })
    ).rejects.toThrow('You are trying to use a token that is not available')

    expect(availableTokensToUse).toEqual({
      loading: false,
      value: expect.arrayContaining([
        expect.objectContaining({
          symbol: expect.any(String),
          blockchain: 'neo3',
          name: expect.any(String),
        }),
      ]),
    })
  })

  it('Should be able to set the token to use to null', async () => {
    await simpleSwapService.init()
    await simpleSwapService.setTokenToUse(null)

    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToUse).toEqual({ loading: false, value: null })
    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(availableTokensToReceive).toEqual({ loading: false, value: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  })

  it('Should be able to set the token to use', async () => {
    await simpleSwapService.init()

    const token = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(token)

    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({
      loading: false,
      value: expect.arrayContaining([
        expect.objectContaining({
          symbol: expect.any(String),
          name: expect.any(String),
        }),
      ]),
    })
    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should not be able to set the account to use if account blockchain is different of token to use blockchain', async () => {
    await simpleSwapService.init()
    await simpleSwapService.setTokenToUse(availableTokensToUse.value![1])

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)
    account.blockchain = 'NONEXISTENT' as any
    simpleSwapService.setAccountToUse(account)

    expect(expect(accountToUse).toEqual({ loading: false, value: account, valid: false }))
  }, 10000)

  it('Should be able to set the account to use to null', async () => {
    await simpleSwapService.init()

    const token = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(token)
    await simpleSwapService.setAccountToUse(null)

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set the account to use', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(token)

    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)
    await simpleSwapService.setAccountToUse(account)

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set the amount to use', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)

    await simpleSwapService.setAccountToUse(account)

    await simpleSwapService.setAmountToUse('1')

    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, 1000)
    )

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: '1' })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it("Should not be able to set the token to receive if the available tokens to receive isn't set", async () => {
    await simpleSwapService.init()
    await expect(simpleSwapService.setTokenToReceive(null)).rejects.toThrow('Available tokens to receive is not set')
  })

  it("Should not be able to set the token to receive if it's not in the available tokens to receive", async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(token)

    await expect(
      simpleSwapService.setTokenToReceive({ symbol: 'INVALID', blockchain: 'neo3', name: 'INVALID', id: 'INVALID' })
    ).rejects.toThrow('You are trying to use a token that is not available')
  }, 10000)

  it('Should be able to set the token to receive to null', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setTokenToReceive(null)

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: amountToUse.value })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  })

  it('Should be able to set the token to receive', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)
    await simpleSwapService.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value![0]
    await simpleSwapService.setTokenToReceive(tokenReceive)

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value?.min })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set an invalid address', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)
    await simpleSwapService.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value![1]
    await simpleSwapService.setTokenToReceive(tokenReceive)

    await simpleSwapService.setAddressToReceive('INVALID')

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value?.min })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: 'INVALID', valid: false })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set a valid address', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    const tokenReceive = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY as string)
    await simpleSwapService.setAccountToUse(account)

    await simpleSwapService.setTokenToReceive(tokenReceive)
    await simpleSwapService.setAddressToReceive(account.address)

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUse.value })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: account.address, valid: true })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 20000)
})
