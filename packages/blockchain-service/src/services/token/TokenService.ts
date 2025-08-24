import {
  ITokenService,
  Token,
  TTokenServicePredicateByHashParams,
  TTokenServicePredicateBySymbolParams,
  TTokenServicePredicateParams,
} from '../../interfaces'

export abstract class TokenService implements ITokenService {
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

  normalizeToken<T extends Token | Token[]>(token: T): T {
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

  abstract normalizeHash(hash: string): string
}
