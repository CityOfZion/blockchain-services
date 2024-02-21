import { gql } from '@urql/core'

type BitqueryNetwork = 'ethereum' | 'goerli'

export type BitqueryTransaction = {
  block: {
    timestamp: {
      unixtime: number
    }
    height: number
  }
  transaction: {
    gasValue: number
    hash: string
  }
  amount: number
  currency: {
    address: string
    tokenType: string
    decimals: number
    symbol: string
    name: string
  }
  sender: {
    address: string
  }
  receiver: {
    address: string
  }
  entityId: string
}

type BitQueryGetTransactionsByAddressResponse = {
  ethereum: {
    sent: BitqueryTransaction[]
    received: BitqueryTransaction[]
    sentCount: {
      count: number
    }[]
    receiverCount: {
      count: number
    }[]
  }
}

type BitQueryGetTransactionsByAddressVariables = {
  address: string
  limit: number
  offset: number
  network: BitqueryNetwork
}

export const bitqueryGetTransactionsByAddressQuery = gql<
  BitQueryGetTransactionsByAddressResponse,
  BitQueryGetTransactionsByAddressVariables
>`
  query getTransactions($address: String!, $limit: Int!, $offset: Int!, $network: EthereumNetwork!) {
    ethereum(network: $network) {
      sent: transfers(
        options: { limit: $limit, offset: $offset, desc: "block.timestamp.unixtime" }
        sender: { is: $address }
      ) {
        block {
          timestamp {
            unixtime
          }
          height
        }
        amount
        currency {
          address
          tokenType
          symbol
          decimals
          name
        }
        sender {
          address
        }
        receiver {
          address
        }
        transaction {
          gasValue
          hash
        }
        entityId
      }
      received: transfers(
        options: { limit: $limit, offset: $offset, desc: "block.timestamp.unixtime" }
        receiver: { is: $address }
      ) {
        block {
          timestamp {
            unixtime
          }
          height
        }
        amount
        currency {
          address
          tokenType
        }
        sender {
          address
        }
        receiver {
          address
        }
        transaction {
          gasValue
          hash
        }
        entityId
      }
      sentCount: transfers(sender: { is: $address }) {
        count
      }
      receiverCount: transfers(receiver: { is: $address }) {
        count
      }
    }
  }
`

type BitQueryGetTransactionResponse = {
  ethereum: {
    transfers: BitqueryTransaction[]
  }
}
type BitQueryGetTransactionVariables = {
  hash: string
  network: BitqueryNetwork
}
export const bitqueryGetTransactionQuery = gql<BitQueryGetTransactionResponse, BitQueryGetTransactionVariables>`
  query getTransaction($hash: String!, $network: EthereumNetwork!) {
    ethereum(network: $network) {
      transfers(txHash: { is: $hash }) {
        block {
          timestamp {
            unixtime
          }
          height
        }
        amount
        currency {
          address
          tokenType
        }
        sender {
          address
        }
        receiver {
          address
        }
        transaction {
          gasValue
          hash
        }
        entityId
      }
    }
  }
`

type BitQueryGetContractResponse = {
  ethereum: {
    smartContractCalls: {
      smartContract: {
        address: {
          address: string
        }
        currency: {
          symbol: string
          name: string
          decimals: number
          tokenType: string
        }
      }
    }[]
  }
}
type BitQueryGetTokenInfoVariables = {
  hash: string
  network: BitqueryNetwork
}
export const bitqueryGetTokenInfoQuery = gql<BitQueryGetContractResponse, BitQueryGetTokenInfoVariables>`
  query getTokenInfo($hash: String!, $network: EthereumNetwork!) {
    ethereum(network: $network) {
      smartContractCalls(smartContractAddress: { is: $hash }, options: { limit: 1 }) {
        smartContract {
          address {
            address
          }
          currency {
            symbol
            name
            decimals
            tokenType
          }
        }
      }
    }
  }
`

type BitQueryGetBalanceResponse = {
  ethereum: {
    address: {
      balance: number
      balances:
        | {
            currency: {
              address: string
              symbol: string
              name: string
              decimals: number
            }
            value: number
          }[]
        | null
    }[]
  }
}
type BitQueryGetBalanceVariables = {
  address: string
  network: BitqueryNetwork
}
export const bitqueryGetBalanceQuery = gql<BitQueryGetBalanceResponse, BitQueryGetBalanceVariables>`
  query getBalance($address: String!, $network: EthereumNetwork!) {
    ethereum(network: $network) {
      address(address: { is: $address }) {
        balance
        balances {
          currency {
            address
            symbol
            name
            decimals
          }
          value
        }
      }
    }
  }
`
type BitQueryGetTokenPricesResponse = {
  ethereum: {
    dexTrades: {
      baseCurrency: {
        address: string
        symbol: string
      }
      quoteCurrency: {
        address: string
        symbol: string
      }
      date: {
        date: string
      }
      quotePrice: number
    }[]
  }
}
export type BitQueryGetTokenPricesVariables = {
  after: string
  network: BitqueryNetwork
}
export const bitqueryGetPricesQuery = gql<BitQueryGetTokenPricesResponse, BitQueryGetTokenPricesVariables>`
  query getPrice($after: ISO8601DateTime!, $network: EthereumNetwork!) {
    ethereum(network: $network) {
      dexTrades(options: { desc: "date.date" }, time: { after: $after }) {
        quoteCurrency(quoteCurrency: { is: "0xdac17f958d2ee523a2206206994597c13d831ec7" }) {
          symbol
          address
        }
        baseCurrency {
          symbol
          address
        }
        date {
          date
        }
        quotePrice
      }
    }
  }
`
