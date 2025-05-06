import {
  Account,
  BSCommonConstants,
  SwapServiceLoadableValue,
  SwapServiceMinMaxAmount,
  SwapServiceToken,
  SwapServiceValidateValue,
  wait,
} from '@cityofzion/blockchain-service'
import { SimpleSwapService } from '../services/SimpleSwapService'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { SimpleSwapApi } from '../apis/SimpleSwapApi'

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
let extraIdToReceive: SwapServiceValidateValue<string>
let accountToUse: SwapServiceValidateValue<Account<'neo3'>>
let error: string | undefined

describe('SimpleSwapService', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    error = undefined
    availableTokensToUse = { loading: false, value: null }
    availableTokensToReceive = { loading: false, value: null }
    tokenToUse = { loading: false, value: null }
    tokenToReceive = { loading: false, value: null }
    amountToUse = { loading: false, value: null }
    amountToUseMinMax = { loading: false, value: null }
    amountToReceive = { loading: false, value: null }
    addressToReceive = { loading: false, value: null, valid: null }
    extraIdToReceive = { loading: false, value: null, valid: null }
    accountToUse = { loading: false, value: null, valid: null }

    blockchainServicesByName = {
      neo3: new BSNeo3('neo3'),
    }

    simpleSwapService = new SimpleSwapService({
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

    simpleSwapService.eventEmitter.on('extraIdToReceive', value => {
      extraIdToReceive = value
    })

    simpleSwapService.eventEmitter.on('accountToUse', value => {
      accountToUse = value
    })

    simpleSwapService.eventEmitter.on('error', value => {
      error = value
    })
  })

  it('Should not be able to set the token to use if available tokens to use is not set', async () => {
    await expect(simpleSwapService.setTokenToUse(null)).rejects.toThrow('Available tokens to use is not set')
  })

  it("Should not be able to set the token to use if it's not in the available tokens to use", async () => {
    await simpleSwapService.init()
    await expect(
      simpleSwapService.setTokenToUse({
        symbol: 'INVALID',
        blockchain: 'neo3',
        name: 'INVALID',
        id: 'INVALID',
        hasExtraId: false,
      })
    ).rejects.toThrow('You are trying to use a token that is not available')

    expect(availableTokensToUse).toEqual({
      loading: false,
      value: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          symbol: expect.any(String),
          blockchain: 'neo3',
          name: expect.any(String),
          hash: expect.any(String),
          imageUrl: expect.any(String),
          hasExtraId: expect.any(Boolean),
          addressTemplateUrl: `${BSCommonConstants.DORA_URL}/address/neo3/mainnet/{address}`,
          txTemplateUrl: `${BSCommonConstants.DORA_URL}/transaction/neo3/mainnet/{txId}`,
        }),
      ]),
    })
  }, 10000)

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
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(availableTokensToReceive).toEqual({ loading: false, value: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  })

  it('Should be able to set the token to use', async () => {
    await simpleSwapService.init()

    const token = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(token)

    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({
      loading: false,
      value: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          symbol: expect.any(String),
          name: expect.any(String),
          hasExtraId: expect.any(Boolean),
        }),
      ]),
    })
    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should not be able to set the account to use if account blockchain is different of token to use blockchain', async () => {
    await simpleSwapService.init()
    await simpleSwapService.setTokenToUse(availableTokensToUse.value![0])

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    account.blockchain = 'NONEXISTENT' as any
    simpleSwapService.setAccountToUse(account)

    expect(expect(accountToUse).toEqual({ loading: false, value: account, valid: false }))
  }, 10000)

  it('Should be able to set the account to use to null', async () => {
    await simpleSwapService.init()

    const token = availableTokensToUse.value![0]

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
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set the account to use', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(token)

    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapService.setAccountToUse(account)

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set the amount to use', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    await simpleSwapService.setAccountToUse(account)

    const amount = '89'

    await simpleSwapService.setAmountToUse(amount)

    await wait(1000)

    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(amountToUse).toEqual({ loading: false, value: amount })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it("Should not be able to set the token to receive if the available tokens to receive isn't set", async () => {
    await simpleSwapService.init()
    await expect(simpleSwapService.setTokenToReceive(null)).rejects.toThrow('Available tokens to receive is not set')
  }, 10000)

  it("Should not be able to set the token to receive if it's not in the available tokens to receive", async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(token)

    await expect(
      simpleSwapService.setTokenToReceive({
        symbol: 'INVALID',
        blockchain: 'neo3',
        name: 'INVALID',
        id: 'INVALID',
        hasExtraId: false,
      })
    ).rejects.toThrow('You are trying to use a token that is not available')
  }, 10000)

  it('Should be able to set the token to receive to null', async () => {
    await simpleSwapService.init()
    const token = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

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
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set the token to receive', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapService.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value![1]
    await simpleSwapService.setTokenToReceive(tokenReceive)

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value?.min })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set the correct min and max amount with Gas (8 decimals)', async () => {
    await simpleSwapService.init()

    const gasToken = availableTokensToUse.value!.find(({ id }) => id === 'gasn3:neo3')!

    await simpleSwapService.setTokenToUse(gasToken)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    await simpleSwapService.setAccountToUse(account)

    await simpleSwapService.setTokenToReceive(availableTokensToReceive.value![0])

    const min = amountToUseMinMax.value!.min

    expect(amountToUseMinMax).toEqual({
      loading: false,
      value: expect.objectContaining({ min: expect.any(String), max: null }),
    })
    expect(min).toContain('.')
    expect(min.split('.').at(1)!.length).toBeGreaterThanOrEqual(8)
  }, 10000)

  it('Should be able to set the correct min and max amount with Neo (0 decimals)', async () => {
    await simpleSwapService.init()

    const neoToken = availableTokensToUse.value!.find(({ id }) => id === 'neo3:neo3')!

    await simpleSwapService.setTokenToUse(neoToken)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    await simpleSwapService.setAccountToUse(account)

    await simpleSwapService.setTokenToReceive(availableTokensToReceive.value![0])

    expect(amountToUseMinMax).toEqual({
      loading: false,
      value: expect.objectContaining({ min: expect.any(String), max: expect.any(String) }),
    })
    expect(amountToUseMinMax.value!.min).not.toContain('.')
  }, 10000)

  it('Should be able to set an invalid address', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
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
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set a valid address', async () => {
    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    const tokenReceive = availableTokensToUse.value![1]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
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
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 20000)

  it('Should be able to set an invalid extraIdToReceive to XRP', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!

    await simpleSwapService.setTokenToReceive(xrpToken)

    const extraId = 'INVALID'.repeat(20)

    await simpleSwapService.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: false })
  }, 10000)

  it('Should be able to set a valid extraIdToReceive to XRP', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!

    await simpleSwapService.setTokenToReceive(xrpToken)

    const extraId = process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapService.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })
  }, 10000)

  it('Should be able to set an invalid extraIdToReceive to Notcoin', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapService.setTokenToReceive(notcoinToken)

    const extraId = 'INVALID'.repeat(20)

    await simpleSwapService.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: false })
  }, 10000)

  it('Should be able to set a valid extraIdToReceive to Notcoin', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapService.setTokenToReceive(notcoinToken)

    const extraId = process.env.TEST_NOTCOIN_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapService.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })
  }, 10000)

  it('Should clear extraIdToReceive when changes the tokenToReceive', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapService.setTokenToReceive(xrpToken)

    const extraId = process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapService.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })

    await simpleSwapService.setTokenToReceive(notcoinToken)

    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
  }, 20000)

  it('Should clear amountToReceive and amountToUseMinMax when setTokenToUse is called', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]
    const tokenReceive = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    await simpleSwapService.setTokenToReceive(tokenReceive)
    await simpleSwapService.setAddressToReceive(account.address)

    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })

    // Not use await to avoid finishing recalculateValues
    simpleSwapService.setTokenToUse(tokenUse)

    expect(amountToReceive).toEqual({ loading: true, value: null })
    expect(amountToUseMinMax).toEqual({ loading: true, value: null })
  }, 10000)

  it('Should clear amountToReceive and amountToUseMinMax when setTokenToReceive is called', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]
    const tokenReceive = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    await simpleSwapService.setTokenToReceive(tokenReceive)
    await simpleSwapService.setAddressToReceive(account.address)

    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })

    // Not use await to avoid finishing recalculateValues
    simpleSwapService.setTokenToReceive(tokenReceive)

    expect(amountToReceive).toEqual({ loading: true, value: null })
    expect(amountToUseMinMax).toEqual({ loading: true, value: null })
  }, 10000)

  it('Should be able to set error when the API throw an error when calling init', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getCurrencies').mockRejectedValueOnce(new Error('API ERROR'))
    try {
      await simpleSwapService.init()
    } catch {
      /* empty */
    }
    expect(error).toBeTruthy()
  })

  it('Should be able to set error when the API throw an error when trying to recalculate available tokens to receive', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getPairs').mockRejectedValueOnce(new Error('API ERROR'))

    await simpleSwapService.init()
    const token = availableTokensToUse.value![0]

    try {
      await simpleSwapService.setTokenToUse(token)
    } catch {
      /* empty */
    }

    expect(error).toBeTruthy()
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: null })
    expect(tokenToUse).toEqual({ loading: false, value: token })
    expect(tokenToReceive).toEqual({ loading: false, value: null })
    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set error when the API throw an error when trying to recalculate min amount to use', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getRange').mockRejectedValueOnce(new Error('API ERROR'))

    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapService.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value![1]

    try {
      await simpleSwapService.setTokenToReceive(tokenReceive)
    } catch {
      /* empty */
    }

    expect(error).toBeTruthy()
    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: null })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: null })
  }, 10000)

  it('Should be able to set error when the API throw an error when trying to recalculate amount to receive', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getEstimate').mockRejectedValueOnce(new Error('API ERROR'))

    await simpleSwapService.init()
    const tokenUse = availableTokensToUse.value![0]
    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapService.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value![1]
    try {
      await simpleSwapService.setTokenToReceive(tokenReceive)
    } catch {
      /* empty */
    }

    expect(error).toBeTruthy()
    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value?.min })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it.skip('Should create a swap when all fields are filled', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]
    const tokenReceive = availableTokensToUse.value![1]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    await simpleSwapService.setTokenToReceive(tokenReceive)
    await simpleSwapService.setAddressToReceive(account.address)

    const result = await simpleSwapService.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)

  it("Should return an error on create a swap to XRP when extraIdToReceive isn't filled", async () => {
    const swapSpy = jest.spyOn(simpleSwapService, 'swap')

    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!

    await simpleSwapService.setTokenToReceive(xrpToken)
    await simpleSwapService.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)

    try {
      await simpleSwapService.swap()
    } catch {
      /* empty */
    }

    await expect(swapSpy).rejects.toThrow()
  }, 20000)

  it.skip('Should create a swap to XRP when all fields are filled with extraIdToReceive', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!

    await simpleSwapService.setTokenToReceive(xrpToken)
    await simpleSwapService.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN)

    const result = await simpleSwapService.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)

  it("Should return an error on create a swap to Notcoin when extraIdToReceive isn't filled", async () => {
    const swapSpy = jest.spyOn(simpleSwapService, 'swap')

    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapService.setTokenToReceive(notcoinToken)
    await simpleSwapService.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)

    try {
      await simpleSwapService.swap()
    } catch {
      /* empty */
    }

    await expect(swapSpy).rejects.toThrow()
  }, 20000)

  it.skip('Should create a swap to Notcoin when all fields are filled with extraIdToReceive', async () => {
    await simpleSwapService.init()

    const tokenUse = availableTokensToUse.value![0]

    await simpleSwapService.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)

    await simpleSwapService.setAccountToUse(account)
    await simpleSwapService.setAmountToUse('89')

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapService.setTokenToReceive(notcoinToken)
    await simpleSwapService.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapService.setExtraIdToReceive(process.env.TEST_NOTCOIN_EXTRA_ID_TO_SWAP_TOKEN)

    const result = await simpleSwapService.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)
})
