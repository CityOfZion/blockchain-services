import { hasExplorerService, type IBlockchainService, type TBSToken } from '@cityofzion/blockchain-service'
import type { TSwapApiAssetRef, TSwapToken, TSwapTokenToUse } from './types'
import type { BSAggregator } from '../../BSAggregator'
import type { TBSServiceName } from '../../types'

export class SwapHelper {
  // Canonical chain identifier used by the swap backend for each supported blockchain service
  static readonly CHAIN_BY_BLOCKCHAIN: Partial<Record<TBSServiceName, string>> = {
    neo3: 'neo3',
    ethereum: 'ethereum',
    polygon: 'polygon',
    base: 'base',
    arbitrum: 'arbitrum',
    bitcoin: 'bitcoin',
    solana: 'solana',
    stellar: 'stellar',
  }

  // The swap backend uses provider tickers for some assets that differ from our token symbols
  static readonly ASSET_ID_BY_SYMBOL_BY_BLOCKCHAIN: Partial<Record<TBSServiceName, Record<string, string>>> = {
    neo3: { NEO: 'NEO3', GAS: 'GASN3' },
  }

  static #getService(blockchain: TBSServiceName, bsAggregator: BSAggregator) {
    const service = bsAggregator.blockchainServicesByNameRecord[blockchain]
    // The swap backend only works with mainnet assets
    if (!service || service.network.type !== 'mainnet') return
    return service
  }

  static #getExplorerTemplates(service: IBlockchainService<TBSServiceName, string>) {
    if (!hasExplorerService(service)) return {}

    return {
      addressTemplateUrl: service.explorerService.getAddressTemplateUrl(),
      txTemplateUrl: service.explorerService.getTransactionTemplateUrl(),
    }
  }

  static #getAssetIdFromToken(blockchain: TBSServiceName, token: TBSToken) {
    const symbol = token.symbol.toUpperCase()

    return this.ASSET_ID_BY_SYMBOL_BY_BLOCKCHAIN[blockchain]?.[symbol] || symbol
  }

  static #getSymbolFromAssetId(blockchain: TBSServiceName | undefined, assetId: string) {
    const upperCaseAssetId = assetId.toUpperCase()
    const assetIdBySymbol = blockchain ? this.ASSET_ID_BY_SYMBOL_BY_BLOCKCHAIN[blockchain] : undefined
    const symbol = Object.entries(assetIdBySymbol || {}).find(([, value]) => value === upperCaseAssetId)?.[0]

    return symbol || upperCaseAssetId
  }

  static buildTokenId(asset: TSwapApiAssetRef) {
    return [asset.assetId, asset.chain, asset.network].filter(Boolean).join(':').toLowerCase()
  }

  static buildAssetRef(token: TSwapToken): TSwapApiAssetRef {
    return { chain: token.chain, assetId: token.assetId, network: token.network }
  }

  static isBlockchainSupported(blockchain: TBSServiceName, bsAggregator: BSAggregator) {
    return !!this.CHAIN_BY_BLOCKCHAIN[blockchain] && !!this.#getService(blockchain, bsAggregator)
  }

  static convertToSwapToken(
    blockchain: TBSServiceName,
    token: TBSToken,
    bsAggregator: BSAggregator
  ): TSwapTokenToUse | undefined {
    const service = this.#getService(blockchain, bsAggregator)
    const chain = this.CHAIN_BY_BLOCKCHAIN[blockchain]
    if (!service || !chain) return

    const assetId = this.#getAssetIdFromToken(blockchain, token)

    return {
      id: this.buildTokenId({ chain, assetId }),
      chain,
      assetId,
      blockchain,
      symbol: token.symbol,
      name: token.name,
      hash: token.hash,
      decimals: token.decimals,
      ...this.#getExplorerTemplates(service),
    }
  }

  static convertAssetRefToSwapToken(asset: TSwapApiAssetRef, bsAggregator: BSAggregator): TSwapToken {
    const blockchain = (Object.keys(this.CHAIN_BY_BLOCKCHAIN) as TBSServiceName[]).find(
      item => this.CHAIN_BY_BLOCKCHAIN[item] === asset.chain && !!this.#getService(item, bsAggregator)
    )

    const symbol = this.#getSymbolFromAssetId(blockchain, asset.assetId)
    const service = blockchain ? this.#getService(blockchain, bsAggregator) : undefined
    const token = service?.tokens.find(item => item.symbol.toUpperCase() === symbol)

    return {
      id: this.buildTokenId(asset),
      chain: asset.chain,
      assetId: asset.assetId,
      network: asset.network,
      blockchain,
      symbol: token?.symbol || symbol,
      name: token?.name || symbol,
      hash: token?.hash,
      decimals: token?.decimals,
      ...(service ? this.#getExplorerTemplates(service) : {}),
    }
  }
}
