import solanaSDK from '@solana/web3.js'
import * as solanaSplSDK from '@solana/spl-token'
import * as metaplexSDK from '@metaplex-foundation/js'

type MetaplexMetadata = metaplexSDK.Nft | (metaplexSDK.Mint & { name: string })

export class BSSolanaCachedMethodsHelper {
  static #splAccountCache: Map<string, solanaSplSDK.Account | null> = new Map()
  static #splAddressCache: Map<string, solanaSDK.PublicKey | null> = new Map()
  static #metaplexMetadataCache: Map<string, MetaplexMetadata | null> = new Map()

  static async getMetaplexMetadata(tokenHash: string, connection: solanaSDK.Connection) {
    const metadataCache = this.#metaplexMetadataCache.get(tokenHash)
    if (metadataCache !== undefined) {
      return metadataCache
    }

    let metadata: MetaplexMetadata | null = null

    const metaplexInstance = metaplexSDK.Metaplex.make(connection)

    try {
      const nftMetadata = await metaplexInstance.nfts().findByMint({
        mintAddress: new solanaSDK.PublicKey(tokenHash),
      })

      if (nftMetadata.model === 'sft') {
        metadata = { ...nftMetadata.mint, name: nftMetadata.name }
      } else {
        metadata = nftMetadata
      }
    } catch {
      try {
        const tokenMetadata = await metaplexInstance.tokens().findMintByAddress({
          address: new solanaSDK.PublicKey(tokenHash),
        })

        metadata = { ...tokenMetadata, name: tokenMetadata.currency.symbol }
      } catch {
        /* empty */
      }
    }

    this.#metaplexMetadataCache.set(tokenHash, metadata)
    return metadata
  }

  static async getSplAddress(
    address: string,
    mint: string,
    instructions: solanaSDK.ParsedInstruction[],
    connection: solanaSDK.Connection
  ) {
    const splAddress = this.#splAddressCache.get(address)
    if (splAddress !== undefined) {
      return splAddress
    }

    let owner: solanaSDK.PublicKey | null = null

    // find owner in instructions, it may found a wrong address,
    // but it is necessary in some cases where the token account is closed and can`t found
    for (const instruction of instructions) {
      const info = instruction.parsed.info

      if (
        instruction.parsed.type.startsWith('initializeAccount') &&
        info.account === address &&
        info.owner &&
        info.mint === mint
      ) {
        owner = new solanaSDK.PublicKey(info.owner)
        break
      }

      if (instruction.parsed.type === 'closeAccount' && info.account === address && info.owner) {
        owner = new solanaSDK.PublicKey(info.owner)
        break
      }
    }

    if (!owner) {
      const account = await this.getSplAccount(address, connection)
      if (account) {
        owner = account.owner
      }
    }

    this.#splAddressCache.set(address, owner)

    return owner
  }

  static async getSplAccount(address: string, connection: solanaSDK.Connection) {
    const account = this.#splAccountCache.get(address)
    if (account !== undefined) {
      return account
    }

    let tokenAccount: solanaSplSDK.Account | null = null

    try {
      tokenAccount = await solanaSplSDK.getAccount(connection, new solanaSDK.PublicKey(address))
    } catch {
      /* empty */
    }

    this.#splAccountCache.set(address, tokenAccount)

    return tokenAccount
  }
}
