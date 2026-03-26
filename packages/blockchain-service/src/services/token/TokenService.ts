import type {
  IBlockchainService,
  ITokenService,
  TBSNetworkId,
  TBSToken,
  TTokenServicePredicateByHashParams,
  TTokenServicePredicateBySymbolParams,
  TTokenServicePredicateParams,
} from '../../interfaces'

export abstract class TokenService<N extends string, A extends TBSNetworkId> implements ITokenService {
  protected _service: IBlockchainService<N, A>

  constructor(service: IBlockchainService<N, A>) {
    this._service = service
  }

  predicate(compareFrom: TTokenServicePredicateParams, compareTo: TTokenServicePredicateParams) {
    if (this.normalizeHash(compareFrom.hash) === this.normalizeHash(compareTo.hash)) return true

    if (compareFrom.symbol && compareTo.symbol && compareFrom.symbol.toLowerCase() === compareTo.symbol.toLowerCase())
      return true

    return false
  }

  predicateByHash(compareFrom: TTokenServicePredicateByHashParams, compareTo: TTokenServicePredicateByHashParams) {
    return (
      this.normalizeHash(typeof compareFrom === 'string' ? compareFrom : compareFrom.hash) ===
      this.normalizeHash(typeof compareTo === 'string' ? compareTo : compareTo.hash)
    )
  }

  predicateBySymbol(
    compareFrom: TTokenServicePredicateBySymbolParams,
    compareTo: TTokenServicePredicateBySymbolParams
  ) {
    const symbol = typeof compareFrom === 'string' ? compareFrom : compareFrom.symbol
    const lowercaseSymbol = symbol.toLowerCase()

    const symbolToPredicate = typeof compareTo === 'string' ? compareTo : compareTo.symbol
    const lowercaseSymbolToPredicate = symbolToPredicate.toLowerCase()

    return lowercaseSymbol === lowercaseSymbolToPredicate
  }

  normalizeToken<T extends TBSToken | TBSToken[]>(token: T): T {
    if (Array.isArray(token)) {
      return token.map(item => ({
        ...item,
        hash: this.normalizeHash(item.hash),
      })) as T
    }

    return {
      ...token,
      hash: this.normalizeHash(token.hash),
    }
  }

  validateTokenHash(hash?: string): hash is string {
    hash = hash?.trim()

    if (!hash) return false

    return !this.isNativeToken(hash)
  }

  isNativeToken(hash: string): boolean {
    return this._service.nativeTokens.some(token => this.predicateByHash(hash, token))
  }

  abstract normalizeHash(hash: string): string
}
