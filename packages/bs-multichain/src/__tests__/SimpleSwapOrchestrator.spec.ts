import {
  TBSAccount,
  BSUtilsHelper,
  TSwapLoadableValue,
  TSwapMinMaxAmount,
  TSwapToken,
  TSwapValidateValue,
} from '@cityofzion/blockchain-service'
import { SimpleSwapOrchestrator } from '../features/swap/SimpleSwapOrchestrator'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { SimpleSwapApi } from '../features/swap/SimpleSwapApi'
import { BSEthereum } from '@cityofzion/bs-ethereum'

let blockchainServicesByName: Record<string, BSNeo3<'neo3'> | BSEthereum<'ethereum'>>
let simpleSwapOrchestrator: SimpleSwapOrchestrator<'neo3' | 'ethereum'>
let availableTokensToUse: TSwapLoadableValue<TSwapToken<'neo3' | 'ethereum'>[]>
let availableTokensToReceive: TSwapLoadableValue<TSwapToken<'neo3' | 'ethereum'>[]>
let tokenToUse: TSwapLoadableValue<TSwapToken<'neo3' | 'ethereum'>>
let tokenToReceive: TSwapLoadableValue<TSwapToken<'neo3' | 'ethereum'>>
let amountToUse: TSwapLoadableValue<string>
let amountToUseMinMax: TSwapLoadableValue<TSwapMinMaxAmount>
let amountToReceive: TSwapLoadableValue<string>
let addressToReceive: TSwapValidateValue<string>
let extraIdToReceive: TSwapValidateValue<string>
let accountToUse: TSwapValidateValue<TBSAccount<'neo3' | 'ethereum'>>
let error: string | undefined

describe('SimpleSwapOrchestrator', () => {
  beforeEach(async () => {
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
      ethereum: new BSEthereum('ethereum'),
    }

    simpleSwapOrchestrator = new SimpleSwapOrchestrator({
      blockchainServicesByName,
      chainsByServiceName: {
        neo3: ['neo3'],
        ethereum: ['eth'],
      },
    })

    simpleSwapOrchestrator.eventEmitter.on('availableTokensToUse', value => {
      availableTokensToUse = value
    })

    simpleSwapOrchestrator.eventEmitter.on('availableTokensToReceive', value => {
      availableTokensToReceive = value
    })

    simpleSwapOrchestrator.eventEmitter.on('tokenToUse', value => {
      tokenToUse = value
    })

    simpleSwapOrchestrator.eventEmitter.on('tokenToReceive', value => {
      tokenToReceive = value
    })

    simpleSwapOrchestrator.eventEmitter.on('amountToUse', value => {
      amountToUse = value
    })

    simpleSwapOrchestrator.eventEmitter.on('amountToUseMinMax', value => {
      amountToUseMinMax = value
    })

    simpleSwapOrchestrator.eventEmitter.on('amountToReceive', value => {
      amountToReceive = value
    })

    simpleSwapOrchestrator.eventEmitter.on('addressToReceive', value => {
      addressToReceive = value
    })

    simpleSwapOrchestrator.eventEmitter.on('extraIdToReceive', value => {
      extraIdToReceive = value
    })

    simpleSwapOrchestrator.eventEmitter.on('accountToUse', value => {
      accountToUse = value
    })

    simpleSwapOrchestrator.eventEmitter.on('error', value => {
      error = value
    })

    await BSUtilsHelper.wait(5000)
  })

  it('Should not be able to set the token to use if available tokens to use is not set', async () => {
    await expect(simpleSwapOrchestrator.setTokenToUse(null)).rejects.toThrow('Available tokens to use is not set')
  })

  it("Should not be able to set the token to use if it's not in the available tokens to use", async () => {
    await simpleSwapOrchestrator.init()

    await expect(
      simpleSwapOrchestrator.setTokenToUse({
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
          blockchain: expect.any(String),
          name: expect.any(String),
          hash: expect.any(String),
          imageUrl: expect.any(String),
          hasExtraId: expect.any(Boolean),
          addressTemplateUrl: expect.any(String),
          txTemplateUrl: expect.any(String),
        }),
      ]),
    })
  }, 10000)

  it('Should be able to set the token to use to null', async () => {
    await simpleSwapOrchestrator.init()

    await simpleSwapOrchestrator.setTokenToUse(null)

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
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

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
    await simpleSwapOrchestrator.init()

    await simpleSwapOrchestrator.setTokenToUse(availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)

    account.blockchain = 'NONEXISTENT' as any

    await simpleSwapOrchestrator.setAccountToUse(account)

    expect(accountToUse).toEqual({ loading: false, value: account, valid: false })
  }, 10000)

  it('Should be able to set the account to use to null', async () => {
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

    await simpleSwapOrchestrator.setAccountToUse(null)

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
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

    expect(accountToUse).toEqual({ loading: false, value: null, valid: null })

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

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
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const amount = '89'
    await simpleSwapOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(1000)

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
    await simpleSwapOrchestrator.init()

    await expect(simpleSwapOrchestrator.setTokenToReceive(null)).rejects.toThrow(
      'Available tokens to receive is not set'
    )
  }, 10000)

  it("Should not be able to set the token to receive if it's not in the available tokens to receive", async () => {
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

    await expect(
      simpleSwapOrchestrator.setTokenToReceive({
        symbol: 'INVALID',
        blockchain: 'neo3',
        name: 'INVALID',
        id: 'INVALID',
        hasExtraId: false,
      })
    ).rejects.toThrow('You are trying to use a token that is not available')
  }, 10000)

  it('Should be able to set the token to receive to null', async () => {
    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(token)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(null)

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
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value!.filter(token => token.blockchain === 'neo3')[1]!
    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value!.min })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set the correct min and max amount with Gas (8 decimals)', async () => {
    await simpleSwapOrchestrator.init()

    const gasToken = availableTokensToUse.value!.find(({ id }) => id === 'gasn3:neo3')!
    await simpleSwapOrchestrator.setTokenToUse(gasToken)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(
      availableTokensToReceive.value!.find(token => token.blockchain === 'neo3')!
    )

    const min = amountToUseMinMax.value!.min

    expect(amountToUseMinMax).toEqual({
      loading: false,
      value: expect.objectContaining({ min: expect.any(String), max: expect.anything() }),
    })

    expect(min).toContain('.')
    expect(min.split('.').at(1)!.length).toBeLessThanOrEqual(8)
  }, 10000)

  it('Should be able to set the correct min and max amount with Neo (0 decimals)', async () => {
    await simpleSwapOrchestrator.init()

    const neoToken = availableTokensToUse.value!.find(({ id }) => id === 'neo3:neo3')!
    await simpleSwapOrchestrator.setTokenToUse(neoToken)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(
      availableTokensToReceive.value!.find(token => token.blockchain === 'neo3')!
    )

    expect(amountToUseMinMax).toEqual({
      loading: false,
      value: expect.objectContaining({ min: expect.any(String), max: expect.any(String) }),
    })

    expect(amountToUseMinMax.value!.min).not.toContain('.')
  }, 10000)

  it('Should be able to set an invalid address', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value!.filter(token => token.blockchain === 'neo3')[1]!
    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    await simpleSwapOrchestrator.setAddressToReceive('INVALID')

    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value!.min })
    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(addressToReceive).toEqual({ loading: false, value: 'INVALID', valid: false })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it('Should be able to set a valid address', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')
    const tokenUse = tokens[0]!
    const tokenReceive = tokens[1]!

    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    await simpleSwapOrchestrator.setAddressToReceive(account.address)

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
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    await simpleSwapOrchestrator.setTokenToReceive(xrpToken)

    const extraId = 'INVALID'.repeat(20)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: false })
  }, 10000)

  it('Should be able to set a valid extraIdToReceive to XRP', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    await simpleSwapOrchestrator.setTokenToReceive(xrpToken)

    const extraId = process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setExtraIdToReceive(extraId)

    await BSUtilsHelper.wait(1000)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })
  }, 10000)

  it('Should be able to set an invalid extraIdToReceive to Notcoin', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!
    await simpleSwapOrchestrator.setTokenToReceive(notcoinToken)

    const extraId = 'INVALID'.repeat(20)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: false })
  }, 10000)

  it('Should be able to set a valid extraIdToReceive to Notcoin', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!
    await simpleSwapOrchestrator.setTokenToReceive(notcoinToken)

    const extraId = process.env.TEST_NOTCOIN_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setExtraIdToReceive(extraId)

    await BSUtilsHelper.wait(1000)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })
  }, 10000)

  it('Should clear extraIdToReceive when changes the tokenToReceive', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!

    await simpleSwapOrchestrator.setTokenToReceive(xrpToken)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    const extraId = process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setExtraIdToReceive(extraId)

    expect(extraIdToReceive).toEqual({ loading: false, value: extraId, valid: true })

    await simpleSwapOrchestrator.setTokenToReceive(notcoinToken).catch(() => {})
    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
  }, 20000)

  it('Should clear amountToReceive and amountToUseMinMax when setTokenToUse is called', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')
    const tokenUse = tokens[0]!
    const tokenReceive = tokens[1]!

    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    await simpleSwapOrchestrator.setAddressToReceive(account.address)

    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })

    // Not use await to avoid finishing recalculateValues
    simpleSwapOrchestrator.setTokenToUse(tokenUse)

    expect(amountToReceive).toEqual({ loading: true, value: null })
    expect(amountToUseMinMax).toEqual({ loading: true, value: null })
  }, 10000)

  it('Should clear amountToReceive and amountToUseMinMax when setTokenToReceive is called', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!
    const tokenUse = tokens.find(token => token.blockchain === 'neo3')!

    const tokenReceive = tokens[1]!

    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    await simpleSwapOrchestrator.setAddressToReceive(account.address)

    expect(amountToReceive).toEqual({ loading: false, value: expect.any(String) })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })

    // Not use await to avoid finishing recalculateValues
    simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    expect(amountToReceive).toEqual({ loading: true, value: null })
    expect(amountToUseMinMax).toEqual({ loading: true, value: null })
  }, 10000)

  it('Should be able to set error when the API throw an error when calling init', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getCurrencies').mockRejectedValueOnce(new Error('API ERROR'))

    try {
      await simpleSwapOrchestrator.init()
    } catch {
      /* empty */
    }

    expect(error).toBeTruthy()
  })

  it('Should be able to set error when the API throw an error when trying to recalculate available tokens to receive', async () => {
    jest.spyOn(SimpleSwapApi.prototype, 'getPairs').mockRejectedValueOnce(new Error('API ERROR'))

    await simpleSwapOrchestrator.init()

    const token = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!

    try {
      await simpleSwapOrchestrator.setTokenToUse(token)
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

    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')[0]!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value!.filter(token => token.blockchain === 'neo3')[1]!

    try {
      await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)
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

    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')[0]!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const tokenReceive = availableTokensToReceive.value!.filter(token => token.blockchain === 'neo3')[1]!

    try {
      await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)
    } catch {
      /* empty */
    }

    expect(error).toBeTruthy()
    expect(tokenToUse).toEqual({ loading: false, value: tokenUse })
    expect(accountToUse).toEqual({ loading: false, value: account, valid: true })
    expect(availableTokensToUse).toEqual({ loading: false, value: expect.any(Array) })
    expect(availableTokensToReceive).toEqual({ loading: false, value: expect.any(Array) })
    expect(tokenToReceive).toEqual({ loading: false, value: tokenReceive })
    expect(amountToUse).toEqual({ loading: false, value: amountToUseMinMax.value!.min })
    expect(amountToReceive).toEqual({ loading: false, value: null })
    expect(addressToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(extraIdToReceive).toEqual({ loading: false, value: null, valid: null })
    expect(amountToUseMinMax).toEqual({ loading: false, value: expect.objectContaining({ min: expect.any(String) }) })
  }, 10000)

  it.skip('Should create a swap when all fields are filled', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')
    const tokenUse = tokens[0]!
    const tokenReceive = tokens[1]!

    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)
    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)
    await simpleSwapOrchestrator.setAddressToReceive(account.address)

    const result = await simpleSwapOrchestrator.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)

  it("Should return an error on create a swap to XRP when extraIdToReceive isn't filled", async () => {
    const swapSpy = jest.spyOn(simpleSwapOrchestrator, 'swap')

    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    await simpleSwapOrchestrator.setTokenToReceive(xrpToken)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)

    try {
      await simpleSwapOrchestrator.swap()
    } catch {
      /* empty */
    }

    await expect(swapSpy).rejects.toThrow()
  }, 20000)

  it.skip('Should create a swap to XRP when all fields are filled with extraIdToReceive', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    const xrpToken = availableTokensToReceive.value!.find(({ id }) => id === 'xrp:xrp')!
    await simpleSwapOrchestrator.setTokenToReceive(xrpToken)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_XRP_ADDRESS_TO_SWAP_TOKEN)

    await simpleSwapOrchestrator.setExtraIdToReceive(process.env.TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN)

    const result = await simpleSwapOrchestrator.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)

  it("Should return an error on create a swap to Notcoin when extraIdToReceive isn't filled", async () => {
    const swapSpy = jest.spyOn(simpleSwapOrchestrator, 'swap')

    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!
    await simpleSwapOrchestrator.setTokenToReceive(notcoinToken)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)

    try {
      await simpleSwapOrchestrator.swap()
    } catch {
      /* empty */
    }

    await expect(swapSpy).rejects.toThrow()
  }, 20000)

  it.skip('Should create a swap to Notcoin when all fields are filled with extraIdToReceive', async () => {
    await simpleSwapOrchestrator.init()

    const tokenUse = availableTokensToUse.value!.find(token => token.blockchain === 'neo3')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY_TO_SWAP_TOKEN)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setAmountToUse(amountToUseMinMax.value!.min)

    const notcoinToken = availableTokensToReceive.value!.find(({ id }) => id === 'ton:ton')!
    await simpleSwapOrchestrator.setTokenToReceive(notcoinToken)

    await simpleSwapOrchestrator.setAddressToReceive(process.env.TEST_NOTCOIN_ADDRESS_TO_SWAP_TOKEN)

    await simpleSwapOrchestrator.setExtraIdToReceive(process.env.TEST_NOTCOIN_EXTRA_ID_TO_SWAP_TOKEN)

    const result = await simpleSwapOrchestrator.swap()

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        txFrom: undefined,
        log: expect.any(String),
      })
    )
  }, 20000)

  it('Should calculate fee with the same blockchain', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!.filter(token => token.blockchain === 'neo3')
    const tokenUse = tokens[0]!
    const tokenReceive = tokens[1]!

    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.neo3.generateAccountFromKey(process.env.TEST_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(tokenReceive)

    await simpleSwapOrchestrator.setAddressToReceive(account.address)

    const fee = await simpleSwapOrchestrator.calculateFee()

    expect(fee).toEqual(expect.any(String))
  }, 30000)

  it('Should calculate fee or throw the correct error with different blockchains', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!

    const tokenUse = tokens.find(token => token.id === 'eth:eth')!
    await simpleSwapOrchestrator.setTokenToUse(tokenUse)

    const account = blockchainServicesByName.ethereum.generateAccountFromKey(process.env.TEST_ETHEREUM_PRIVATE_KEY)
    await simpleSwapOrchestrator.setAccountToUse(account)

    await simpleSwapOrchestrator.setTokenToReceive(
      availableTokensToReceive.value!.find(token => token.id === 'gasn3:neo3')!
    )

    await simpleSwapOrchestrator.setAddressToReceive('NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD')

    let fee: string | undefined

    try {
      fee = await simpleSwapOrchestrator.calculateFee()
    } catch (error: any) {
      expect(error.message).toContain('insufficient funds for intrinsic transaction cost')

      return
    }

    expect(fee).toEqual(expect.any(String))
  }, 30000)

  it('Should get decimals (or precision) from a non-native token and a native token', async () => {
    await simpleSwapOrchestrator.init()

    const tokens = availableTokensToUse.value!
    const usdtFromEth = tokens.find(token => token.id === 'usdt:eth')
    const ethFromEth = tokens.find(token => token.id === 'eth:eth')

    expect(usdtFromEth?.decimals).toBe(6)
    expect(ethFromEth?.decimals).toBe(18)
  }, 10000)
})
