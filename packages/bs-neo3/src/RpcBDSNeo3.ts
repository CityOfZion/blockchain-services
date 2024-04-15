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
import { NeonInvoker, TypeChecker } from '@cityofzion/neon-dappkit'
import { TOKENS } from './constants'

export class RPCBDSNeo3 implements BlockchainDataService, BDSClaimable {
  readonly _tokenCache: Map<string, Token> = new Map()
  readonly _feeToken: Token
  readonly _claimToken: Token
  readonly _network: Network

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2

  constructor(network: Network, feeToken: Token, claimToken: Token) {
    this._network = network
    this._feeToken = feeToken
    this._claimToken = claimToken
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
    const localToken = TOKENS[this._network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this._tokenCache.has(tokenHash)) {
      return this._tokenCache.get(tokenHash)!
    }
    try {
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
      const token = {
        name: contractState.manifest.name,
        symbol,
        hash: contractState.hash,
        decimals,
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
    const balances = await Promise.all(promises)

    return balances
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
}
