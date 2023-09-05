import {
  BDSClaimable,
  BalanceResponse,
  BlockchainDataService,
  ContractMethod,
  ContractParameter,
  ContractResponse,
  Network,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import { rpc, u } from '@cityofzion/neon-core'
import { NeonInvoker } from '@cityofzion/neon-invoker'
import { TOKENS } from './constants'

export class RPCBDSNeo3 implements BlockchainDataService, BDSClaimable {
  protected readonly tokenCache: Map<string, Token> = new Map()
  protected readonly feeToken: Token
  protected readonly claimToken: Token
  readonly network: Network

  constructor(network: Network, feeToken: Token, claimToken: Token) {
    this.network = network
    this.feeToken = feeToken
    this.claimToken = claimToken
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    try {
      const rpcClient = new rpc.RPCClient(this.network.url)
      const response = await rpcClient.getRawTransaction(hash, true)

      return {
        hash: response.hash,
        block: response.validuntilblock,
        fee: u.BigInteger.fromNumber(response.netfee ?? 0)
          .add(u.BigInteger.fromNumber(response.sysfee ?? 0))
          .toDecimal(this.feeToken.decimals),
        notifications: [],
        transfers: [],
        time: response.blocktime,
      }
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress(_params: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    throw new Error('Method not supported.')
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    try {
      const rpcClient = new rpc.RPCClient(this.network.url)
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
    const localToken = TOKENS[this.network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this.tokenCache.has(tokenHash)) {
      return this.tokenCache.get(tokenHash)!
    }
    try {
      const rpcClient = new rpc.RPCClient(this.network.url)
      const contractState = await rpcClient.getContractState(tokenHash)

      const invoker = await NeonInvoker.init({
        rpcAddress: this.network.url,
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

      const decimals = Number(response.stack[0].value)
      const symbol = u.base642utf8(response.stack[1].value as string)
      const token = {
        name: contractState.manifest.name,
        symbol,
        hash: contractState.hash,
        decimals,
      }

      this.tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`Token not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const rpcClient = new rpc.RPCClient(this.network.url)
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
      } catch {}

      return {
        amount: u.BigInteger.fromNumber(balance.amount).toDecimal(token?.decimals ?? 8),
        token,
      }
    })
    const balances = await Promise.all(promises)

    return balances
  }

  async getBlockHeight(): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    return await rpcClient.getBlockCount()
  }

  async getUnclaimed(address: string): Promise<string> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getUnclaimedGas(address)
    return u.BigInteger.fromNumber(response).toDecimal(this.claimToken.decimals)
  }
}
