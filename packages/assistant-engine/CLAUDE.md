# assistant-engine

AI-powered assistant that drives a blockchain wallet UI by dispatching typed actions. Wraps any `IService` implementation (currently Gemini) and translates natural-language chat into structured flow actions via LLM tool calling.

## Purpose

- Accept conversation history via `AssistantEngine.chat()`
- Build a system prompt (`#buildContext`) from briefing, language, and user accounts
- Delegate to `IService.prompt()` — the service uses tool calling to return `{ name, args }`
- Validate `args` per action with Zod schemas → return `TChatResponse`

## Structure

```
src/
  AssistantEngine.ts              # Main class — context, tool dispatch, Zod validation
  enums.ts                        # EAssistantEngineError (INVALID_PARAMS | SERVICE_ERROR | INVALID_RESPONSE | INVALID_ACTING_ACCOUNT)
  interfaces.ts                   # IService, IAssistantEngine, TAssistantEngineParams
  types.ts                        # Data types: TAccount, TMessage, TPromptParams/Response, TChatResponse union
  index.ts                        # Public exports
  tools/
    gemini.ts                     # Gemini function declarations (geminiTools, JSON Schema types)
  helpers/
    CaseConverterHelper.ts        # kebabCaseToCamelCase / camelCaseToKebabCase
  schemas/
    chat.schema.ts                # Zod: TChatParams input validation
    prompt-args.schema.ts         # Zod: per-action args schemas (noneArgsSchema, transferArgsSchema, …)
    account.schema.ts
    blockchains.schema.ts
    token.schema.ts
  services/
    gemini/GeminiService.ts       # IService impl — Gemini function calling API (x-goog-api-key header)
  __tests__/
    AssistantEngine.spec.ts       # Integration tests (hit real Gemini API) — afterEach waits 30s (hookTimeout 60s) to avoid rate limits
    mocks/
      accounts.mock.ts            # accountsMock — test-only, excluded from build via tsconfig.build.json
```

## Key Types

| Type | Location | Description |
|---|---|---|
| `TAccount` | `types.ts` | id, address, blockchain, name, walletId, walletName, tokens (with amount) |
| `TMessage` | `types.ts` | `{ author: 'user' \| 'assistant', text }` |
| `TChatParams` | `types.ts` | `{ messages }` — caller includes current user message as last entry in messages |
| `TPromptParams` | `types.ts` | `{ messages, context }` — passed to IService |
| `TPromptResponse` | `types.ts` | `{ name: string, args: Record<string, unknown> }` — raw tool call result |
| `TChatResponse` | `types.ts` | Discriminated union over all actions |
| `IService` | `interfaces.ts` | `prompt(TPromptParams): Promise<TPromptResponse>` |
| `TAssistantEngineParams` | `interfaces.ts` | `{ service, briefing, language, accounts }` |

## Actions (flow primitives)

Step actions: `none`, `set-acting-account`, `set-recipient-address`, `set-token`, `set-amount`

Final actions: `transfer`

Each action response: `{ action, text, data }` — no `isFinalAction` or `dependentActions`.

Adding a new flow = add types in `types.ts`, update `#buildContext` flows section, add Zod args schema in `prompt-args.schema.ts`, add tool declaration in `tools/gemini.ts`, add case in `#buildResponse`.

## How Tool Calling Works

`GeminiService` sends `tools/gemini.ts` function declarations to the Gemini API with `functionCallingConfig: { mode: 'ANY' }`, forcing the model to always call a function. The response is `{ functionCall: { name, args } }` — no JSON parsing needed. `AssistantEngine.#buildResponse()` dispatches on `name` and validates `args` with the matching Zod schema from `prompt-args.schema.ts`.

Action names use kebab-case internally (`set-acting-account`). `CaseConverterHelper` converts to camelCase for Gemini (`setActingAccount`) and back.

### Entity Reference Rules (in `text` param)

- **Accounts**: use account name and address — never the ID
- **Wallets**: use wallet name — never the ID
- **Tokens**: use symbol or name with hash (if necessary)

### Step Resolution Logic

`#buildContext` instructs the LLM to track resolved steps from conversation history and call only the first unresolved step's function. Key rules encoded in the prompt:
- Step functions are for REQUESTING missing info only — never for confirming
- Never re-call a function already called in a previous turn
- `set-recipient-address`: always returns ALL account IDs without filtering
- `set-token`: returns only token objects from acting account, never account IDs
- `transfer.amount`: digits and at most one decimal point only

`transferArgsSchema.amount` has a Zod transform as a safety net: extracts the first valid number from the string (guards against LLM producing malformed values like `"1.51.5"`).

### Context Caching

`GeminiService` uses [Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching) to avoid resending `systemInstruction` + `tools` on every request. On the first `prompt()` call, it POSTs to `/cachedContents` (TTL 3600s) and stores the cache name. Subsequent calls pass `cachedContent: name` instead. If cache creation fails (e.g. min token count not met), falls back silently to non-cached mode. On generate failure with a stale/expired cache, resets and retries without cache automatically.

### Message History

`AssistantEngine.chat()` truncates `messages` to the last 20 before passing to the service, preventing unbounded token growth across long sessions. The caller is responsible for appending the current user message to `messages` before each `chat()` call.

## Adding a New IService

Implement `IService` from `interfaces.ts`:

```typescript
class MyService implements IService {
  async prompt({ messages, context }: TPromptParams): Promise<TPromptResponse> {
    // call LLM with tool/function declarations
    // return { name: 'set-acting-account', args: { text: '...', accounts: [...] } }
  }
}
```

Pass to `AssistantEngine` constructor as `service`.

## Environment

Tests hit the real Gemini API. Requires `.env`:

```
GEMINI_API_KEY=your_key_here
```

## Commands

```bash
rushx build      # lint + typecheck + tsc
rushx test       # vitest run (needs GEMINI_API_KEY)
rushx lint
rushx format
rushx typecheck
```

Run single test file:

```bash
rushx test src/__tests__/AssistantEngine.spec.ts
```