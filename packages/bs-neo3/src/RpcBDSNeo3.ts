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

export class RPCBDSNeo3 implements BlockchainDataService, BDSClaimable {
  constructor(readonly network: Network) {}

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getRawTransaction(hash, true)

    return {
      hash: response.hash,
      block: response.validuntilblock,
      netfee: response.netfee,
      sysfee: response.sysfee,
      totfee: (Number(response.netfee) + Number(response.sysfee)).toString(),
      notifications: [],
      transfers: [],
      time: response.blocktime.toString(),
    }
  }

  async getHistoryTransactions(_address: string, _page: number): Promise<TransactionHistoryResponse> {
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

    return {
      name: contractState.manifest.name,
      symbol,
      hash: contractState.hash,
      decimals,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getNep17Balances(address)

    const promises = response.balance.map<Promise<BalanceResponse>>(async balance => {
      const {
        manifest: { name },
      } = await rpcClient.getContractState(balance.assethash)

      const invoker = await NeonInvoker.init({
        rpcAddress: this.network.url,
      })

      const response = await invoker.testInvoke({
        invocations: [
          {
            scriptHash: balance.assethash,
            operation: 'decimals',
            args: [],
          },
          { scriptHash: balance.assethash, operation: 'symbol', args: [] },
        ],
      })

      const decimals = Number(response.stack[0].value)
      const symbol = u.base642utf8(response.stack[1].value as string)

      return {
        amount: Number(u.BigInteger.fromNumber(balance.amount).toDecimal(decimals)),
        hash: balance.assethash,
        name,
        symbol,
        decimals,
      }
    })
    const balances = await Promise.all(promises)

    return balances
  }

  async getUnclaimed(address: string): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    const response = await rpcClient.getUnclaimedGas(address)
    return Number(response)
  }
}
