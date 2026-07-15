type TJsonSchemaPrimitive =
  | { type: 'string'; description?: string; enum?: string[] }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }

type TJsonSchemaObject = {
  type: 'object'
  description?: string
  properties: Record<string, TJsonSchemaProperty>
  required?: string[]
}

type TJsonSchemaArray = {
  type: 'array'
  description?: string
  items: TJsonSchemaProperty
}

type TJsonSchemaProperty = TJsonSchemaPrimitive | TJsonSchemaObject | TJsonSchemaArray

type TGeminiTool = {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, TJsonSchemaProperty>
    required: string[]
  }
}

const tokenProperty: TJsonSchemaProperty = {
  type: 'object',
  properties: {
    hash: { type: 'string' },
    symbol: { type: 'string' },
    name: { type: 'string' },
    decimals: { type: 'number' },
    amount: { type: 'string' },
  },
  required: ['hash', 'symbol', 'name', 'decimals', 'amount'],
}

export const geminiTools: TGeminiTool[] = [
  {
    name: 'none',
    description: 'Off-topic request, unsupported feature, greeting or ambiguous intent.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'set-acting-account',
    description:
      'The acting account (sender, voter, buyer, payer, etc.) is not yet identified. Return the IDs of ALL accounts from the ACCOUNTS context that match the user intent. Never omit any matching account.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
        accountIds: {
          type: 'array',
          description: 'IDs of accounts from the ACCOUNTS context.',
          items: { type: 'string' },
        },
      },
      required: ['text', 'accountIds'],
    },
  },
  {
    name: 'set-recipient-address',
    description:
      'The recipient address is needed but not yet identified. Return the IDs of ALL accounts from the ACCOUNTS context without any filtering. Never omit any account. Always include every account, including the acting account. The list must be identical to the full ACCOUNTS context list.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
        accountIds: {
          type: 'array',
          description: 'IDs of accounts from the ACCOUNTS context.',
          items: { type: 'string' },
        },
      },
      required: ['text', 'accountIds'],
    },
  },
  {
    name: 'set-token',
    description:
      'The acting account is known but which token to use is not yet decided. Return the tokens array from the acting account in ACCOUNTS context. Do NOT return account IDs — only token objects with hash, symbol, name, decimals, amount fields.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
        tokens: { type: 'array', description: 'Token options from the acting account.', items: tokenProperty },
      },
      required: ['text', 'tokens'],
    },
  },
  {
    name: 'set-amount',
    description:
      "The transfer amount has not been specified yet. Ask the user for an amount. Check the `amount` field of the token object returned in the set-token step from conversation history — if the user's value exceeds it, call this function again and tell the user the maximum available amount. Only resolve when the value is valid and within the available balance.",
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'transfer',
    description: 'Final action for the Transfer flow. Call only when all required steps are resolved.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message shown to the user.' },
        actingAccountId: { type: 'string', description: 'ID of the acting account from ACCOUNTS context.' },
        recipientAddress: {
          type: 'string',
          description: 'Address of the recipient, either chosen from ACCOUNTS context or typed by the user.',
        },
        token: tokenProperty,
        amount: {
          type: 'string',
          description:
            'Numeric transfer amount extracted from user message. Output ONLY the digits and decimal point (e.g. "1.5." → "1.5", "5 GAS" → "5"). Never concatenate or repeat the value.',
        },
      },
      required: ['text', 'actingAccountId', 'recipientAddress', 'token', 'amount'],
    },
  },
]
