import { Token } from '../interfaces'

type TPredicateToken = {
  hash: string
  symbol?: string
}

export class BSTokenHelper {
  static predicate({ hash, symbol }: TPredicateToken) {
    const normalizedHash = this.normalizeHash(hash)

    return (params: TPredicateToken) => {
      if (normalizedHash === this.normalizeHash(params.hash)) return true

      if (symbol && params.symbol && symbol.toLowerCase() === params.symbol.toLowerCase()) return true

      return false
    }
  }

  static predicateByHash(tokenOrHash: string | { hash: string }) {
    const hash = typeof tokenOrHash === 'string' ? tokenOrHash : tokenOrHash.hash
    const normalizedHash = this.normalizeHash(hash)

    return (params: string | { hash: string }) =>
      normalizedHash === this.normalizeHash(typeof params === 'string' ? params : params.hash)
  }

  static predicateBySymbol(tokenOrSymbol: string | { symbol: string }) {
    const symbol = typeof tokenOrSymbol === 'string' ? tokenOrSymbol : tokenOrSymbol.symbol
    const lowercaseSymbol = symbol.toLowerCase()

    return (params: string | { symbol: string }) => {
      const tokenSymbol = typeof params === 'string' ? params : params.symbol
      const lowercaseTokenSymbol = tokenSymbol.toLowerCase()

      return lowercaseSymbol === lowercaseTokenSymbol
    }
  }

  static normalizeToken<T extends Token | Token[]>(token: T): T {
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

  static normalizeHash(hash: string): string {
    const fixed = hash.startsWith('0x') ? hash : `0x${hash}`
    return fixed.toLowerCase()
  }
}
