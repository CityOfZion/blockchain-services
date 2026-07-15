import { IAssistantEngine, IService, TAssistantEngineParams } from './interfaces'
import { TAccount, TChatParams, TChatResponse, TPromptResponse } from './types'
import { chatParamsSchema } from './schemas/chat.schema'
import {
  noneArgsSchema,
  setAmountArgsSchema,
  setRecipientAddressArgsSchema,
  setActingAccountArgsSchema,
  setTokenArgsSchema,
  transferArgsSchema,
} from './schemas/prompt-args.schema'
import { EAssistantEngineError } from './enums'

export class AssistantEngine implements IAssistantEngine {
  readonly #service: IService
  readonly #briefing: string
  readonly #language: string
  readonly #accounts: TAccount[]
  readonly #context: string

  constructor({ service, briefing, language, accounts }: TAssistantEngineParams) {
    this.#service = service
    this.#briefing = briefing
    this.#language = language
    this.#accounts = accounts
    this.#context = this.#buildContext()
  }

  #buildContext(): string {
    return `# ASSISTANT ENGINE
You help a user to control a blockchain UI via function calls.

## ROLE
${this.#briefing}

## RULES
- Always call a function. Never plain text.
- Polite tone in "text" param.
- Only handle flows below; else call "none" and inform user it's not supported yet (more flows coming).
- Language: ${this.#language}. Match user language in "text".
- When referring to accounts in "text": use account name and address — never the ID.
- When referring to wallets in "text": use wallet name — never the ID.
- When referring to tokens in "text": use symbol or name with hash (if necessary).

## ACCOUNTS
${JSON.stringify(this.#accounts)}

## LOGIC
Each flow = ordered steps + one final function.
A step is resolved once the user's message fulfills its requirement (see resolution rules below).
On each message: read conversation history → identify which steps are already resolved → call the function for the FIRST unresolved step only.
Never call a step function to confirm or acknowledge — step functions are only for REQUESTING missing information.
Never call a step function if the user's current message already resolves that step; instead, move to the next unresolved step.
Never re-call a function that was already called in a previous turn.
Call final only when ALL steps are resolved.

## FLOWS

### Transfer
Steps (in order): set-acting-account → set-recipient-address → set-token → set-amount
Final: transfer

Resolution rules:
- set-acting-account: resolved when the user has chosen the account to send from. Call with ALL account IDs from ACCOUNTS context.
- set-recipient-address: resolved when the user has provided or confirmed the recipient address. Call with ALL account IDs from ACCOUNTS context — never filter, never omit any account, even if it matches the acting account.
- set-token: resolved when the user has chosen the token to transfer. Call with the tokens array from the acting account in ACCOUNTS context. Do NOT return account IDs here.
- set-amount: resolved when the user provides a numeric value that does not exceed the "amount" field of the token object returned in the set-token step (check conversation history). The amount field must be digits and at most one decimal point only — no units, no punctuation, no extra characters. If the user's value exceeds the token's "amount" field, do NOT resolve — call set-amount again and tell the user the maximum available amount.`
  }

  #resolveAccounts(accountIds: string[]): TAccount[] {
    return accountIds.map(id => this.#accounts.find(account => account.id === id)).filter(Boolean) as TAccount[]
  }

  #buildResponse({ name, args }: TPromptResponse): TChatResponse {
    switch (name) {
      case 'none': {
        const { text } = noneArgsSchema.parse(args)

        return { action: 'none', text, data: null }
      }
      case 'set-acting-account': {
        const { text, accountIds, ...data } = setActingAccountArgsSchema.parse(args)
        const accounts = this.#resolveAccounts(accountIds)

        return { action: 'set-acting-account', text, data: { ...data, accounts } }
      }
      case 'set-recipient-address': {
        const { text, accountIds, ...data } = setRecipientAddressArgsSchema.parse(args)
        const accounts = this.#resolveAccounts(accountIds)

        return { action: 'set-recipient-address', text, data: { ...data, accounts } }
      }
      case 'set-token': {
        const { text, ...data } = setTokenArgsSchema.parse(args)

        return { action: 'set-token', text, data }
      }
      case 'set-amount': {
        const { text } = setAmountArgsSchema.parse(args)

        return { action: 'set-amount', text, data: null }
      }
      case 'transfer': {
        const { text, actingAccountId, ...data } = transferArgsSchema.parse(args)
        const actingAccount = this.#accounts.find(account => account.id === actingAccountId)

        if (!actingAccount) return this.#errorResponse(EAssistantEngineError.INVALID_ACTING_ACCOUNT)

        return { action: 'transfer', text, data: { ...data, actingAccount } }
      }
      default:
        return this.#errorResponse(EAssistantEngineError.INVALID_RESPONSE)
    }
  }

  #errorResponse(error: EAssistantEngineError): TChatResponse {
    return { action: 'error', text: error, data: null }
  }

  async chat(params: TChatParams): Promise<TChatResponse> {
    try {
      chatParamsSchema.parse(params)
    } catch {
      return this.#errorResponse(EAssistantEngineError.INVALID_PARAMS)
    }

    let response: TPromptResponse

    try {
      response = await this.#service.prompt({
        messages: params.messages.slice(-20), // Cutting messages to save tokens
        context: this.#context,
      })
    } catch {
      return this.#errorResponse(EAssistantEngineError.SERVICE_ERROR)
    }

    try {
      return this.#buildResponse(response)
    } catch {
      return this.#errorResponse(EAssistantEngineError.INVALID_RESPONSE)
    }
  }
}
