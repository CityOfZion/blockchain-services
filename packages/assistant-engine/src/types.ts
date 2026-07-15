import { TBSToken } from '@cityofzion/blockchain-service'
import { TBSServiceName } from '@cityofzion/bs-multichain'
import { EAssistantEngineError } from './enums'

// Util types
type TToken = TBSToken & { amount: string }

export type TAccount = {
  id: string
  address: string
  blockchain: TBSServiceName
  name: string
  walletId: string
  walletName: string
  tokens: TToken[]
}

export type TMessage = {
  author: 'user' | 'assistant'
  text: string
}

// Prompt types
export type TPromptParams = {
  messages: TMessage[]
  context: string
}

export type TPromptResponse = {
  name: string
  args: Record<string, unknown>
}

// Chat and action types
export type TChatParams = Pick<TPromptParams, 'messages'>

export type TChatErrorResponse = {
  action: 'error'
  text: EAssistantEngineError
  data: null
}

export type TChatNoneResponse = {
  action: 'none'
  text: string
  data: null
}

export type TChatSetActingAccountResponse = {
  action: 'set-acting-account'
  text: string
  data: {
    accounts: TAccount[]
  }
}

export type TChatSetRecipientAddressResponse = {
  action: 'set-recipient-address'
  text: string
  data: {
    accounts: TAccount[]
  }
}

export type TChatSetTokenResponse = {
  action: 'set-token'
  text: string
  data: {
    tokens: TToken[]
  }
}

export type TChatSetAmountResponse = {
  action: 'set-amount'
  text: string
  data: null
}

export type TChatTransferResponse = {
  action: 'transfer'
  text: string
  data: {
    actingAccount: TAccount
    recipientAddress: string
    amount: string
    token: TToken
  }
}

export type TChatResponse =
  | TChatErrorResponse
  | TChatNoneResponse
  | TChatSetActingAccountResponse
  | TChatSetRecipientAddressResponse
  | TChatSetTokenResponse
  | TChatSetAmountResponse
  | TChatTransferResponse
