import { z } from 'zod'

export const tokenSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  hash: z.string(),
  decimals: z.number(),
  amount: z.string(),
})
