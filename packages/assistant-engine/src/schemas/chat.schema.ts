import { z } from 'zod'

const messageSchema = z.object({ author: z.enum(['user', 'assistant']), text: z.string() })

export const chatParamsSchema = z.object({
  messages: z.array(messageSchema),
})
