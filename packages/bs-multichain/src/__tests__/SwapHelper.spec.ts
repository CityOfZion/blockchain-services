import { BSCommonConstants } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'
import { BSAggregator } from '../BSAggregator'
import { SwapHelper, type TSwapToken } from '../features/swap'

const gasToken: TSwapToken = {
  id: 'gasn3:neo3',
  chain: 'neo3',
  assetId: 'GASN3',
  blockchain: 'neo3',
  symbol: 'GAS',
  name: 'GAS',
  hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
  decimals: 8,
  addressTemplateUrl: `${BSCommonConstants.DORA_URL}/address/neo3/mainnet/{address}`,
  txTemplateUrl: `${BSCommonConstants.DORA_URL}/transaction/neo3/mainnet/{txId}`,
}

let neo3Service: BSNeo3
let bsAggregator: BSAggregator

describe('SwapHelper', () => {
  beforeEach(() => {
    neo3Service = new BSNeo3()
    bsAggregator = new BSAggregator([neo3Service, new BSNeoX()])
  })

  it('Should convert a token to a token to use', () => {
    const gas = neo3Service.tokens.find(token => token.symbol === 'GAS')!
    const flm = neo3Service.tokens.find(token => token.symbol === 'FLM')!

    expect(SwapHelper.convertToSwapToken('neo3', gas, bsAggregator)).toEqual(gasToken)
    expect(SwapHelper.convertToSwapToken('neo3', flm, bsAggregator)).toEqual({
      ...gasToken,
      id: 'flm:neo3',
      assetId: 'FLM',
      symbol: flm.symbol,
      name: flm.name,
      hash: flm.hash,
      decimals: flm.decimals,
    })
  })

  it('Should not convert a token of a blockchain that is not supported by the swap backend', () => {
    const neoxService = bsAggregator.blockchainServicesByName.neox!

    expect(SwapHelper.convertToSwapToken('neox', neoxService.feeToken, bsAggregator)).toBeUndefined()
  })

  it('Should not convert a token when the blockchain service is not on mainnet', () => {
    const testnet = neo3Service.availableNetworks.find(network => network.type === 'testnet')!
    neo3Service.setNetwork(testnet)

    expect(SwapHelper.convertToSwapToken('neo3', neo3Service.feeToken, bsAggregator)).toBeUndefined()
    expect(SwapHelper.isBlockchainSupported('neo3', bsAggregator)).toBe(false)
  })

  it('Should check if a blockchain is supported by the swap backend', () => {
    expect(SwapHelper.isBlockchainSupported('neo3', bsAggregator)).toBe(true)
    expect(SwapHelper.isBlockchainSupported('neox', bsAggregator)).toBe(false)
    expect(SwapHelper.isBlockchainSupported('ethereum', bsAggregator)).toBe(false)
  })

  it('Should convert an asset ref of a known blockchain to a token', () => {
    expect(SwapHelper.convertAssetRefToSwapToken({ chain: 'neo3', assetId: 'NEO3' }, bsAggregator)).toEqual({
      ...gasToken,
      id: 'neo3:neo3',
      assetId: 'NEO3',
      symbol: 'NEO',
      name: 'NEO',
      hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5',
      decimals: 0,
      network: undefined,
    })
  })

  it('Should convert an asset ref of an unknown blockchain to a token without blockchain data', () => {
    expect(
      SwapHelper.convertAssetRefToSwapToken({ chain: 'ripple', assetId: 'XRP', network: 'xrp' }, bsAggregator)
    ).toEqual({
      id: 'xrp:ripple:xrp',
      chain: 'ripple',
      assetId: 'XRP',
      network: 'xrp',
      blockchain: undefined,
      symbol: 'XRP',
      name: 'XRP',
      hash: undefined,
      decimals: undefined,
    })
  })

  it('Should build the token id and asset ref', () => {
    expect(SwapHelper.buildTokenId({ chain: 'ethereum', assetId: 'USDC', network: 'ERC20' })).toBe(
      'usdc:ethereum:erc20'
    )
    expect(SwapHelper.buildAssetRef(gasToken)).toEqual({ chain: 'neo3', assetId: 'GASN3', network: undefined })
  })
})
