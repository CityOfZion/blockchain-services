import type { IAssistantEngine } from '../interfaces'
import type { TMessage } from '../types'
import { AssistantEngine } from '../AssistantEngine'
import { GeminiService } from '../services/gemini/GeminiService'
import { accountsMock } from './mocks/accounts.mock'
import { BSUtilsHelper } from '@cityofzion/blockchain-service'

let assistantEngine: IAssistantEngine
let messages: TMessage[] = []

const briefing =
  'Neon Wallet is COZ’s open-source, self-custodial wallet built to provide a fast, secure, and intuitive way to manage digital assets across Web3. Designed with a unified user experience, it supports multi-wallet management, making it easy to organize and access multiple accounts in one place. The wallet integrates WalletConnect, hardware wallet support, token swaps, and cross-chain bridges, giving users the flexibility to interact with decentralized applications and ecosystems. Its shared architecture ensures a consistent and reliable experience while keeping security at the forefront. Because users retain full control of their private keys and recovery phrases, Neon Wallet never takes custody of their funds. By combining powerful features with a user-friendly interface, Neon Wallet empowers both new and experienced users to confidently navigate the decentralized web.'

const language = 'en-US'

describe('AssistantEngine', () => {
  describe('GeminiService', () => {
    afterEach(async () => {
      // Wait to avoid rate limit
      await BSUtilsHelper.wait(30000)
    }, 60000)

    beforeEach(() => {
      messages = []

      assistantEngine = new AssistantEngine({
        service: new GeminiService('gemini-3.1-flash-lite'),
        briefing,
        language,
        accounts: accountsMock,
      })
    })

    it('Should be able to return transfer action with NEO', async () => {
      const actingAddress = 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD'
      const recipientAddress = 'NN8tbpgAx8zm5BNJZEqvi71Rj2Z8LX2RHh'

      messages.push({ author: 'user', text: 'I would like to transfer.' })

      const firstResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: firstResponse.text })
      messages.push({ author: 'user', text: `Use ${actingAddress}.` })

      const secondResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: secondResponse.text })
      messages.push({ author: 'user', text: `Transfer to this address ${recipientAddress}.` })

      const thirdResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: thirdResponse.text })
      messages.push({ author: 'user', text: 'Use token NEO with 5 as amount.' })

      const fourthResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: fourthResponse.text })

      expect(fourthResponse).toEqual({
        action: 'transfer',
        text: expect.any(String),
        data: {
          actingAccount: expect.objectContaining({
            id: expect.any(String),
            address: 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD',
            blockchain: 'neo3',
            name: expect.any(String),
            walletId: expect.any(String),
            walletName: expect.any(String),
            tokens: expect.arrayContaining([]),
          }),
          recipientAddress: 'NN8tbpgAx8zm5BNJZEqvi71Rj2Z8LX2RHh',
          amount: '5',
          token: expect.objectContaining({
            symbol: 'NEO',
            name: 'NEO',
            hash: expect.any(String),
            decimals: expect.any(Number),
            amount: expect.any(String),
          }),
        },
      })
    }, 120000)

    it('Should be able to return transfer action with GAS', async () => {
      const actingAddress = 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD'
      const recipientAddress = 'NZ1aSCKQePFbXfWndQS1d1mBvqGLiY98VG'

      messages.push({ author: 'user', text: 'I want to transfer.' })

      const firstResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: firstResponse.text })
      messages.push({ author: 'user', text: `Send from ${actingAddress}.` })

      const secondResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: secondResponse.text })
      messages.push({ author: 'user', text: `Send to ${recipientAddress}.` })

      const thirdResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: thirdResponse.text })
      messages.push({ author: 'user', text: 'GAS.' })

      const fourthResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: fourthResponse.text })
      messages.push({ author: 'user', text: '1.25.' })

      const fifthResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: fifthResponse.text })

      expect(fifthResponse).toEqual({
        action: 'transfer',
        text: expect.any(String),
        data: {
          actingAccount: expect.objectContaining({
            id: expect.any(String),
            address: 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD',
            blockchain: 'neo3',
            name: expect.any(String),
            walletId: expect.any(String),
            walletName: expect.any(String),
            tokens: expect.arrayContaining([]),
          }),
          recipientAddress: 'NZ1aSCKQePFbXfWndQS1d1mBvqGLiY98VG',
          amount: '1.25',
          token: expect.objectContaining({
            symbol: 'GAS',
            name: 'GAS',
            hash: expect.any(String),
            decimals: expect.any(Number),
            amount: expect.any(String),
          }),
        },
      })
    }, 120000)

    it('Should be able to return none action when asked about its purpose', async () => {
      messages.push({ author: 'user', text: 'Hi, could you help me?' })

      const firstResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: firstResponse.text })

      expect(firstResponse).toEqual({
        action: 'none',
        text: expect.any(String),
        data: null,
      })

      messages.push({ author: 'user', text: 'Explain to me what you do.' })

      const secondResponse = await assistantEngine.chat({ messages })

      messages.push({ author: 'assistant', text: secondResponse.text })

      expect(secondResponse).toEqual({
        action: 'none',
        text: expect.any(String),
        data: null,
      })
    })

    it('Should be able to return none action when asked about an unsupported action', async () => {
      messages.push({ author: 'user', text: 'Buy 10 NEO tokens and swap to BTC for me.' })

      const response = await assistantEngine.chat({ messages })

      expect(response).toEqual({
        action: 'none',
        text: expect.any(String),
        data: null,
      })
    })
  })
})
