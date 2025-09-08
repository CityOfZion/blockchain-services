import {
  BalanceResponse,
  BDSClaimable,
  BlockchainDataService,
  ContractMethod,
  ContractParameter,
  ContractResponse,
  ExportTransactionsByAddressParams,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  Network,
  RpcResponse,
  Token,
  TokenService,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { rpc, u } from '@cityofzion/neon-core'
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

export class RpcBDSNeo3 implements BlockchainDataService, BDSClaimable {
  readonly _tokenCache: Map<string, Token> = new Map()
  readonly _feeToken: Token
  readonly _claimToken: Token
  readonly _network: Network<BSNeo3NetworkId>
  readonly _tokens: Token[] = []
  readonly _tokenService: TokenService

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2

  constructor(
    network: Network<BSNeo3NetworkId>,
    feeToken: Token,
    claimToken: Token,
    tokens: Token[],
    tokenService: TokenService
  ) {
    this._network = network
    this._feeToken = feeToken
    this._claimToken = claimToken
    this._tokens = tokens
    this._tokenService = tokenService
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    try {
      const rpcClient = new rpc.RPCClient(this._network.url)
      const response = await rpcClient.getRawTransaction(hash, true)

      return {
        hash: response.hash,
        block: response.validuntilblock,
        fee: u.BigInteger.fromNumber(response.netfee ?? 0)
          .add(u.BigInteger.fromNumber(response.sysfee ?? 0))
          .toDecimal(this._feeToken.decimals),
        notifications: [],
        transfers: [],
        time: response.blocktime,
        type: 'default', // It's not possible to set the correct type because we don't have notifications here
      }
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress(_params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    throw new Error('Method not supported.')
  }

  async getFullTransactionsByAddress(
    _params: FullTransactionsByAddressParams
  ): Promise<FullTransactionsByAddressResponse> {
    throw new Error('Method not supported.')
  }

  async exportFullTransactionsByAddress(_params: ExportTransactionsByAddressParams): Promise<string> {
    throw new Error('Method not implemented.')
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    try {
      const rpcClient = new rpc.RPCClient(this._network.url)
      const contractState = await rpcClient.getContractState(contractHash)

      const methods = contractState.manifest.abi.methods.map<ContractMethod>(method => ({
        name: method.name,
        parameters: method.parameters.map<ContractParameter>(parameter => ({
          name: parameter.name,
          type: parameter.type,
        })),
      }))

      return {
        hash: contractState.hash,
        name: contractState.manifest.name,
        methods,
      }
    } catch {
      throw new Error(`Contract not found: ${contractHash}`)
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    try {
      const cachedToken = this._tokenCache.get(tokenHash)
      if (cachedToken) {
        return cachedToken
      }

      let token = this._tokens.find(currentToken => this._tokenService.predicateByHash(tokenHash, currentToken.hash))

      if (!token) {
        const rpcClient = new rpc.RPCClient(this._network.url)
        const contractState = await rpcClient.getContractState(tokenHash)

        const invoker = await NeonInvoker.init({
          rpcAddress: this._network.url,
        })

        const response = await invoker.testInvoke({
          invocations: [
            {
              scriptHash: tokenHash,
              operation: 'decimals',
              args: [],
            },
            { scriptHash: tokenHash, operation: 'symbol', args: [] },
          ],
        })

        if (!TypeChecker.isStackTypeInteger(response.stack[0])) throw new Error('Invalid decimals')
        if (!TypeChecker.isStackTypeByteString(response.stack[1])) throw new Error('Invalid symbol')
        const decimals = Number(response.stack[0].value)
        const symbol = u.base642utf8(response.stack[1].value)
        token = this._tokenService.normalizeToken({
          name: contractState.manifest.name,
          symbol,
          hash: contractState.hash,
          decimals,
        })
      }

      this._tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`Token not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const rpcClient = new rpc.RPCClient(this._network.url)
    const response = await rpcClient.getNep17Balances(address)

    const promises = response.balance.map<Promise<BalanceResponse>>(async balance => {
      let token: Token = {
        hash: balance.assethash,
        name: '-',
        symbol: '-',
        decimals: 8,
      }
      try {
        token = await this.getTokenInfo(balance.assethash)
      } catch {
        // Empty Block
      }

      return {
        amount: u.BigInteger.fromNumber(balance.amount).toDecimal(token?.decimals ?? 8),
        token,
      }
    })

    return await Promise.all(promises)
  }

  async getBlockHeight(): Promise<number> {
    const rpcClient = new rpc.RPCClient(this._network.url)
    return await rpcClient.getBlockCount()
  }

  async getUnclaimed(address: string): Promise<string> {
    const rpcClient = new rpc.RPCClient(this._network.url)
    const response = await rpcClient.getUnclaimedGas(address)
    return u.BigInteger.fromNumber(response).toDecimal(this._claimToken.decimals)
  }

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []

    const urls = BSNeo3Helper.getRpcList(this._network)

    const promises = urls.map(url => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async resolve => {
        const timeout = setTimeout(() => {
          resolve()
        }, 5000)

        try {
          const rpcClient = new rpc.RPCClient(url)

          const timeStart = Date.now()
          const height = await rpcClient.getBlockCount()
          const latency = Date.now() - timeStart

          list.push({ url, latency, height })
        } finally {
          resolve()
          clearTimeout(timeout)
        }
      })
    })

    await Promise.allSettled(promises)

    return list
  }
}
