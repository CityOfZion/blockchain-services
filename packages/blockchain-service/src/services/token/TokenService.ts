import { ITokenService, Token, TTokenServicePredicateParams } from '../../interfaces'

export type TBSTokenHelperPredicateParams = {
  hash: string
  symbol?: string
}

export abstract class TokenService implements ITokenService {
  predicate(compareFrom: TTokenServicePredicateParams, compareTo: TBSTokenHelperPredicateParams) {
    if (this.normalizeHash(compareFrom.hash) === this.normalizeHash(compareTo.hash)) return true

    if (compareFrom.symbol && compareTo.symbol && compareFrom.symbol.toLowerCase() === compareTo.symbol.toLowerCase())
      return true

    return false
  }

  predicateByHash(hashFrom: string, hashTo: string) {
    return this.normalizeHash(hashFrom) === this.normalizeHash(hashTo)
  }

  predicateBySymbol(symbolFrom: string, symbolTo: string) {
    return symbolFrom.toLowerCase() === symbolTo.toLowerCase()
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
