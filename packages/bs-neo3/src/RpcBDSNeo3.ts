import {
  BDSClaimable,
  BalanceResponse,
  BlockchainDataService,
  ContractMethod,
  ContractParameter,
  ContractResponse,
  Network,
  Token,
  TransactionHistoryResponse,
  TransactionResponse,
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
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getRawTransaction(hash, true)

    return {
      hash: response.hash,
      block: response.validuntilblock,
      fee: Number(
        u.BigInteger.fromNumber(response.netfee ?? 0)
          .add(u.BigInteger.fromNumber(response.sysfee ?? 0))
          .toDecimal(this.feeToken.decimals)
      ),
      notifications: [],
      transfers: [],
      time: response.blocktime,
    }
  }

  async getTransactionsByAddress(_address: string, _page: number): Promise<TransactionHistoryResponse> {
    throw new Error('Method not supported.')
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
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
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const localToken = TOKENS[this.network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this.tokenCache.has(tokenHash)) {
      return this.tokenCache.get(tokenHash)!
    }
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
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getNep17Balances(address)

    const promises = response.balance.map<Promise<BalanceResponse>>(async balance => {
      const token = await this.getTokenInfo(balance.assethash)

      return {
        amount: Number(u.BigInteger.fromNumber(balance.amount).toDecimal(token.decimals ?? 0)),
        token,
      }
    })
    const balances = await Promise.all(promises)

    return balances
  }

  async getUnclaimed(address: string): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getUnclaimedGas(address)
    return Number(u.BigInteger.fromNumber(response).toDecimal(this.claimToken.decimals))
  }
}
