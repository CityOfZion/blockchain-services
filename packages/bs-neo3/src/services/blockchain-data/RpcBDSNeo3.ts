import {
  BalanceResponse,
  ContractMethod,
  ContractParameter,
  ContractResponse,
  ExportTransactionsByAddressParams,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  IBlockchainDataService,
  RpcResponse,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { rpc, u } from '@cityofzion/neon-core'
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { IBSNeo3 } from '../../types'

export class RpcBDSNeo3<N extends string> implements IBlockchainDataService {
  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2
  readonly _tokenCache: Map<string, Token> = new Map()
  readonly _service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    this._service = service
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    try {
      const rpcClient = new rpc.RPCClient(this._service.network.url)
      const response = await rpcClient.getRawTransaction(hash, true)

      return {
        hash: response.hash,
        block: response.validuntilblock,
        fee: u.BigInteger.fromNumber(response.netfee ?? 0)
          .add(u.BigInteger.fromNumber(response.sysfee ?? 0))
          .toDecimal(this._service.feeToken.decimals),
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
      const rpcClient = new rpc.RPCClient(this._service.network.url)
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

      let token = this._service.tokens.find(token => this._service.tokenService.predicateByHash(tokenHash, token))

      if (!token) {
        const rpcClient = new rpc.RPCClient(this._service.network.url)
        const contractState = await rpcClient.getContractState(tokenHash)

        const invoker = await NeonInvoker.init({
          rpcAddress: this._service.network.url,
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
        token = this._service.tokenService.normalizeToken({
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
    const rpcClient = new rpc.RPCClient(this._service.network.url)
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
    const rpcClient = new rpc.RPCClient(this._service.network.url)
    return await rpcClient.getBlockCount()
  }

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []

    const urls = BSNeo3Helper.getRpcList(this._service.network)

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
