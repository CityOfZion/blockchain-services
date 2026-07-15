import { TAccount, TChatParams, TChatResponse, TPromptParams, TPromptResponse } from './types'

export interface IService {
  prompt(params: TPromptParams): Promise<TPromptResponse>
}

export type TAssistantEngineParams = {
  service: IService
  briefing: string
  language: string
  accounts: TAccount[]
}

export interface IAssistantEngine {
  chat(params: TChatParams): Promise<TChatResponse>
}
