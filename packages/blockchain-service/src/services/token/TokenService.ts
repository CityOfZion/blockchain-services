import {
  ITokenService,
  Token,
  TTokenServicePredicateByHashParams,
  TTokenServicePredicateBySymbolParams,
  TTokenServicePredicateParams,
} from '../../interfaces'

export type TBSTokenHelperPredicateParams = {
  hash: string
  symbol?: string
}

export abstract class TokenService implements ITokenService {
  predicate({ hash, symbol }: TTokenServicePredicateParams): (params: TTokenServicePredicateParams) => boolean {
    const normalizedHash = this.normalizeHash(hash)

    return (params: TBSTokenHelperPredicateParams) => {
      if (normalizedHash === this.normalizeHash(params.hash)) return true

      if (symbol && params.symbol && symbol.toLowerCase() === params.symbol.toLowerCase()) return true

      return false
    }
  }

  predicateByHash(
    tokenOrHash: TTokenServicePredicateByHashParams
  ): (params: TTokenServicePredicateByHashParams) => boolean {
    const hash = typeof tokenOrHash === 'string' ? tokenOrHash : tokenOrHash.hash
    const normalizedHash = this.normalizeHash(hash)
    return (params: string | { hash: string }) =>
      normalizedHash === this.normalizeHash(typeof params === 'string' ? params : params.hash)
  }

  predicateBySymbol(
    tokenOrSymbol: TTokenServicePredicateBySymbolParams
  ): (params: TTokenServicePredicateBySymbolParams) => boolean {
    const symbol = typeof tokenOrSymbol === 'string' ? tokenOrSymbol : tokenOrSymbol.symbol
    const lowercaseSymbol = symbol.toLowerCase()

    return (params: string | { symbol: string }) => {
      const tokenSymbol = typeof params === 'string' ? params : params.symbol
      const lowercaseTokenSymbol = tokenSymbol.toLowerCase()

      return lowercaseSymbol === lowercaseTokenSymbol
    }
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
