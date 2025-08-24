import {
  Account,
  BalanceResponse,
  BSBigNumberHelper,
  BSError,
  BSUtilsHelper,
  TBridgeToken,
  TBridgeValidateValue,
  TBridgeValue,
} from '@cityofzion/blockchain-service'
import { Neo3NeoXBridgeOrchestrator } from '../features/bridge'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'

type TBridgeBlockchains = 'neo3' | 'neox'

let neo3Service: BSNeo3<TBridgeBlockchains>
let neoXService: BSNeoX<TBridgeBlockchains>
let neo3NeoXBridgeOrchestrator: Neo3NeoXBridgeOrchestrator<TBridgeBlockchains>
let tokenToUse: TBridgeValue<TBridgeToken<TBridgeBlockchains>>
let accountToUse: TBridgeValue<Account<TBridgeBlockchains>>
let amountToUse: TBridgeValidateValue<string>
let amountToUseMin: TBridgeValue<string>
let amountToUseMax: TBridgeValue<string>
let tokenToReceive: TBridgeValue<TBridgeToken<TBridgeBlockchains>>
let addressToReceive: TBridgeValidateValue<string>
let amountToReceive: TBridgeValue<string>
let tokenToUseBalance: TBridgeValue<BalanceResponse | undefined>
let bridgeFee: TBridgeValue<string>

describe('Neo3NeoXBridgeOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    tokenToUse = { value: null, loading: false, error: null }
    accountToUse = { value: null, loading: false, error: null }
    amountToUse = { value: null, valid: null, loading: false, error: null }
    amountToUseMin = { value: null, loading: false, error: null }
    amountToUseMax = { value: null, loading: false, error: null }
    tokenToReceive = { value: null, loading: false, error: null }
    addressToReceive = { value: null, valid: null, loading: false, error: null }
    amountToReceive = { value: null, loading: false, error: null }
    tokenToUseBalance = { value: null, loading: false, error: null }
    bridgeFee = { value: null, loading: false, error: null }

    neo3Service = new BSNeo3<'neo3' | 'neox'>('neo3')
    neoXService = new BSNeoX<'neo3' | 'neox'>('neox')

    neo3NeoXBridgeOrchestrator = new Neo3NeoXBridgeOrchestrator<'neo3' | 'neox'>({
      neo3Service,
      neoXService,
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('tokenToUse', value => {
      tokenToUse = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('accountToUse', value => {
      accountToUse = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('amountToUse', value => {
      amountToUse = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('amountToUseMin', value => {
      amountToUseMin = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('amountToUseMax', value => {
      amountToUseMax = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('tokenToReceive', value => {
      tokenToReceive = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('addressToReceive', value => {
      addressToReceive = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('amountToReceive', value => {
      amountToReceive = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('tokenToUseBalance', value => {
      tokenToUseBalance = value
    })

    neo3NeoXBridgeOrchestrator.eventEmitter.on('bridgeFee', value => {
      bridgeFee = value
    })
  })

  it('Should not be able to set token to use if available tokens are not set', async () => {
    await expect(neo3NeoXBridgeOrchestrator.setTokenToUse(null)).rejects.toThrow(
      new BSError('No available tokens to use', 'NO_AVAILABLE_TOKENS')
    )
  })

  it('Should not be able to set token to use if token is not in the available tokens', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    await expect(
      neo3NeoXBridgeOrchestrator.setTokenToUse({
        symbol: 'INVALID',
        name: 'INVALID',
        hash: 'INVALID',
        decimals: 0,
        multichainId: 'INVALID',
        blockchain: 'neo3',
      })
    ).rejects.toThrow(new BSError('You are trying to use a token that is not available', 'TOKEN_NOT_AVAILABLE'))
  })

  it('Should not be able to set token to use if pair token does not exist', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const invalidToken = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    invalidToken.multichainId = 'INVALID'

    await expect(neo3NeoXBridgeOrchestrator.setTokenToUse(invalidToken)).rejects.toThrow(
      new BSError('Pair token not found', 'PAIR_TOKEN_NOT_FOUND')
    )
  })

  it('Should be able to set token to use', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const setBalanceSpy = jest.spyOn(neo3NeoXBridgeOrchestrator, 'setBalances')
    const setAmountToUseSpy = jest.spyOn(neo3NeoXBridgeOrchestrator, 'setAmountToUse')

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    const pairToken = neo3NeoXBridgeOrchestrator.toService.neo3NeoXBridgeService.tokens.find(
      item => item.multichainId === token.multichainId
    )
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    expect(tokenToUse.value).toEqual(token)
    expect(tokenToReceive.value).toEqual(pairToken)
    expect(amountToUse.value).toEqual(null)
    expect(setBalanceSpy).toHaveBeenCalledTimes(1)
    expect(setAmountToUseSpy).toHaveBeenCalledTimes(1)
    expect(setAmountToUseSpy).toHaveBeenCalledWith(null)
    expect(setAmountToUseSpy).toHaveBeenCalledWith(null)
  })

  it('Should be able to set token to use to null', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    expect(tokenToUse.value).toEqual(token)

    await neo3NeoXBridgeOrchestrator.setTokenToUse(null)

    expect(tokenToUse.value).toEqual(null)
    expect(tokenToReceive.value).toEqual(null)
  })

  it('Should not be able to set account to use if account and service is from different blockchains', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    account.blockchain = 'neox'

    await expect(neo3NeoXBridgeOrchestrator.setAccountToUse(account)).rejects.toThrow(
      new BSError(
        'You are trying to use an account that is not compatible with the selected token',
        'ACCOUNT_NOT_COMPATIBLE_WITH_TOKEN'
      )
    )
  })

  it('Should be able to set account to use', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const setBalanceSpy = jest.spyOn(neo3NeoXBridgeOrchestrator, 'setBalances')
    const setAmountToUseSpy = jest.spyOn(neo3NeoXBridgeOrchestrator, 'setAmountToUse')

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )

    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    expect(accountToUse.value).toEqual(account)
    expect(amountToUse.value).toEqual(null)
    expect(amountToReceive.value).toEqual(null)
    expect(tokenToUseBalance.value).toEqual(null)
    expect(bridgeFee.value).toEqual(null)
    expect(amountToUseMin.value).toEqual(null)
    expect(amountToUseMax.value).toEqual(null)
    expect(setBalanceSpy).toHaveBeenCalledTimes(1)
    expect(setAmountToUseSpy).toHaveBeenCalledTimes(1)
    expect(setAmountToUseSpy).toHaveBeenCalledWith(null)
    expect(setAmountToUseSpy).toHaveBeenCalledWith(null)
  })

  it('Should be able to set account to use to null', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )

    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    expect(accountToUse.value).toEqual(account)

    await neo3NeoXBridgeOrchestrator.setAccountToUse(null)

    expect(accountToUse.value).toEqual(null)
  })

  it('Should be able to set address to receive to a invalid address', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const validateAddressSpy = jest.spyOn(neo3NeoXBridgeOrchestrator.toService, 'validateAddress')

    const receiverAddress = 'INVALID_ADDRESS'
    await neo3NeoXBridgeOrchestrator.setAddressToReceive(receiverAddress)

    expect(addressToReceive.value).toEqual(receiverAddress)
    expect(addressToReceive.valid).toEqual(null)

    await BSUtilsHelper.wait(1500)

    expect(addressToReceive.valid).toEqual(false)
    expect(validateAddressSpy).toHaveBeenCalledTimes(1)
    expect(validateAddressSpy).toHaveBeenCalledWith(receiverAddress)
  })

  it('Should be able to set address to receive to a valid address', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const validateAddressSpy = jest.spyOn(neo3NeoXBridgeOrchestrator.toService, 'validateAddress')

    const toAccount = neo3NeoXBridgeOrchestrator.toService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEOX_PRIVATE_KEY
    )

    await neo3NeoXBridgeOrchestrator.setAddressToReceive(toAccount.address)

    expect(addressToReceive.value).toEqual(toAccount.address)
    expect(addressToReceive.valid).toEqual(null)

    await BSUtilsHelper.wait(1500)

    expect(addressToReceive.valid).toEqual(true)
    expect(validateAddressSpy).toHaveBeenCalledTimes(1)
    expect(validateAddressSpy).toHaveBeenCalledWith(toAccount.address)
  })

  it('Should be able to set address to receive to null', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const validateAddressSpy = jest.spyOn(neo3NeoXBridgeOrchestrator.toService, 'validateAddress')

    const toAccount = neo3NeoXBridgeOrchestrator.toService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEOX_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAddressToReceive(toAccount.address)

    await BSUtilsHelper.wait(1500)

    expect(addressToReceive.value).toEqual(toAccount.address)
    expect(addressToReceive.valid).toEqual(true)
    expect(validateAddressSpy).toHaveBeenCalledTimes(1)

    await neo3NeoXBridgeOrchestrator.setAddressToReceive(null)

    expect(addressToReceive.value).toEqual(null)
    expect(addressToReceive.valid).toEqual(null)

    await BSUtilsHelper.wait(1500)

    expect(addressToReceive.valid).toEqual(null)
    expect(validateAddressSpy).toHaveBeenCalledTimes(1)
  })

  it('Should be able to set balances if balance does not exist', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const balances: BalanceResponse[] = []

    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    expect(tokenToUseBalance.value).toEqual(undefined)
    expect(amountToUseMax.value).toEqual('0')
    expect(amountToUseMin.value).toEqual(expect.any(String))
    expect(bridgeFee.value).toEqual(expect.any(String))
  })

  it('Should be able to set balances', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const balances: BalanceResponse[] = [{ amount: '5', token }]

    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const balance = balances[0]

    const newAmount = BSBigNumberHelper.fromNumber(balance.amount).minus(bridgeFee.value!).toString()
    expect(tokenToUseBalance.value).toEqual(balance)
    expect(amountToUseMax.value).toEqual(newAmount)
    expect(amountToUseMin.value).toEqual(expect.any(String))
    expect(bridgeFee.value).toEqual(expect.any(String))
  })

  it('Should be able to set amount to use if required fields are not set', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const amount = '1'

    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)
    expect(amountToUse.valid).toEqual(null)
    expect(amountToUse.error).toEqual(null)
    expect(amountToReceive.value).toEqual(null)
  })

  it('Should not be able to set amount to use if amount is less than min', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = '0'

    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)
    expect(amountToUse.valid).toEqual(false)
    expect(amountToUse.error).toEqual(new BSError('Amount is below the minimum', 'AMOUNT_BELOW_MINIMUM'))
    expect(amountToReceive.value).toEqual(amount)
  })

  it('Should not be able to set amount to use if amount is greater than max', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]
    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = '10'

    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)
    expect(amountToUse.valid).toEqual(false)
    expect(amountToUse.error).toEqual(new BSError('Amount is above the maximum', 'AMOUNT_ABOVE_MAXIMUM'))
    expect(amountToReceive.value).toEqual(amount)
  })

  it('Should not be able to set amount to use if balance is not sufficient to pay fee', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens.find(
      neo3NeoXBridgeOrchestrator.fromService.tokenService.predicateBySymbol('NEO')
    )!

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = amountToUseMax.value!

    jest.spyOn(neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService, 'getApprovalFee').mockResolvedValue('1')

    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)
    expect(amountToUse.valid).toEqual(false)
    expect(amountToUse.error).toEqual(
      new BSError('You do not have enough fee token balance to cover the bridge fee', 'INSUFFICIENT_FEE_TOKEN_BALANCE')
    )
    expect(amountToReceive.value).toEqual(amount)
  })

  it('Should be able to set amount to use', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = amountToUseMax.value!
    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)
    expect(amountToUse.valid).toEqual(true)
    expect(amountToReceive.value).toEqual(amount)
  })

  it('Should be able to set amount to use to null', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = amountToUseMax.value!
    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)

    await neo3NeoXBridgeOrchestrator.setAmountToUse(null)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(null)
    expect(amountToUse.valid).toEqual(null)
    expect(amountToReceive.value).toEqual(null)
  })

  it('Should be able to switch tokens', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = amountToUseMax.value!
    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    expect(amountToUse.value).toEqual(amount)

    const newTokenToUse = neo3NeoXBridgeOrchestrator.toService.neo3NeoXBridgeService.tokens.find(
      item => item.multichainId === token.multichainId
    )!

    await neo3NeoXBridgeOrchestrator.switchTokens()

    expect(tokenToUse.value).toEqual(newTokenToUse)
    expect(tokenToReceive.value).toEqual(token)
    expect(amountToUse.value).toEqual(null)
    expect(amountToReceive.value).toEqual(null)
    expect(tokenToUseBalance.value).toEqual(null)
    expect(bridgeFee.value).toEqual(null)
    expect(amountToUseMin.value).toEqual(null)
    expect(amountToUseMax.value).toEqual(null)
    expect(accountToUse.value).toEqual(null)
    expect(addressToReceive.value).toEqual(null)
  })

  it('Should not be able to bridge if required fields are not set', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    await expect(neo3NeoXBridgeOrchestrator.bridge()).rejects.toThrow(
      new BSError('Required parameters are not set for bridging', 'BRIDGE_NOT_READY')
    )
  })

  it.skip('Should be able to bridge', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    await neo3NeoXBridgeOrchestrator.switchTokens()

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEOX_PRIVATE_KEY
    )

    const balances = await neo3NeoXBridgeOrchestrator.fromService.blockchainDataService.getBalance(account.address)

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    await neo3NeoXBridgeOrchestrator.setAddressToReceive(
      neo3NeoXBridgeOrchestrator.toService.generateAccountFromKey(process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY).address
    )

    const amount = amountToUseMin.value!
    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    const transactionHash = await neo3NeoXBridgeOrchestrator.bridge()

    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to wait', async () => {
    await neo3NeoXBridgeOrchestrator.init()

    const token = neo3NeoXBridgeOrchestrator.fromService.neo3NeoXBridgeService.tokens[0]

    await neo3NeoXBridgeOrchestrator.setTokenToUse(token)

    const account = neo3NeoXBridgeOrchestrator.fromService.generateAccountFromKey(
      process.env.TEST_BRIDGE_NEO3_PRIVATE_KEY
    )
    await neo3NeoXBridgeOrchestrator.setAccountToUse(account)

    const balances: BalanceResponse[] = [{ amount: '5', token }]
    await neo3NeoXBridgeOrchestrator.setBalances(balances)

    const amount = amountToUseMax.value!
    await neo3NeoXBridgeOrchestrator.setAmountToUse(amount)

    await BSUtilsHelper.wait(3000)

    const transactionHash = await neo3NeoXBridgeOrchestrator.bridge()

    expect(transactionHash).toEqual(expect.any(String))

    const response = await Neo3NeoXBridgeOrchestrator.wait({
      neo3Service,
      neoXService,
      tokenToUse: tokenToUse.value!,
      tokenToReceive: tokenToReceive.value!,
      transactionHash,
    })

    expect(response).toEqual(true)
  })
})
