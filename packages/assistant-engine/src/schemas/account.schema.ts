import { z } from 'zod'

import { blockchainsSchema } from './blockchains.schema'
import { tokenSchema } from './token.schema'

export const accountSchema = z.object({
  id: z.string(),
  address: z.string(),
  blockchain: blockchainsSchema,
  name: z.string(),
  walletId: z.string(),
  walletName: z.string(),
  tokens: z.array(tokenSchema),
})
