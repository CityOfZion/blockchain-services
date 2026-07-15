import { IService } from '../../interfaces'
import { TPromptParams, TPromptResponse } from '../../types'
import { CaseConverterHelper } from '../../helpers/CaseConverterHelper'
import axios, { AxiosInstance } from 'axios'
import { geminiTools } from '../../tools/gemini'

type TModel = 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite'

type TRequestParams = TPromptParams & { cacheName: string | null }

export class GeminiService implements IService {
  readonly #model: TModel
  readonly #client: AxiosInstance

  #cacheNameInit: Promise<string | null> | null = null
  #abortController: AbortController | null = null

  readonly #toolsBody = {
    tools: [
      {
        functionDeclarations: geminiTools.map(tool => ({
          name: CaseConverterHelper.kebabCaseToCamelCase(tool.name),
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    ],
    toolConfig: { functionCallingConfig: { mode: 'ANY' } },
  }

  constructor(model: TModel) {
    this.#model = model

    this.#client = axios.create({
      baseURL: `https://generativelanguage.googleapis.com/v1beta`,
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, // TODO: use COZ API endpoint
    })
  }

  async #createCacheName(context: string): Promise<string | null> {
    try {
      const { data } = await this.#client.post(
        '/cachedContents',
        {
          model: `models/${this.#model}`,
          systemInstruction: { parts: [{ text: context }] },
          ttl: '3600s',
          ...this.#toolsBody,
        },
        { signal: this.#abortController?.signal }
      )

      return data.name
    } catch {
      return null
    }
  }

  #ensureCacheName(context: string): Promise<string | null> {
    if (this.#cacheNameInit === null) {
      this.#cacheNameInit = this.#createCacheName(context)
    }

    return this.#cacheNameInit
  }

  async #request({ messages, context, cacheName }: TRequestParams): Promise<TPromptResponse> {
    const body = {
      contents: messages.map(message => ({
        role: message.author === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.text }],
      })),
    }

    Object.assign(
      body,
      cacheName
        ? { cachedContent: cacheName }
        : { systemInstruction: { parts: [{ text: context }] }, ...this.#toolsBody }
    )

    const { data } = await this.#client.post(`/models/${this.#model}:generateContent`, body, {
      signal: this.#abortController?.signal,
    })

    const functionCall = data?.candidates?.[0]?.content?.parts?.[0]?.functionCall

    if (!functionCall) throw new Error('No function call')

    return {
      name: CaseConverterHelper.camelCaseToKebabCase(functionCall.name.toString()),
      args: functionCall.args || {},
    }
  }

  async prompt(params: TPromptParams): Promise<TPromptResponse> {
    this.#abortController?.abort()
    this.#abortController = new AbortController()

    const cacheName = await this.#ensureCacheName(params.context)

    try {
      return await this.#request({ ...params, cacheName })
    } catch (error) {
      if (cacheName) {
        this.#cacheNameInit = null

        return await this.#request({ ...params, cacheName: null })
      }

      throw error
    }
  }
}
