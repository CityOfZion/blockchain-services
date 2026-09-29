import { z } from 'zod'

export const blockchainsSchema = z.union([
  z.literal('neo3'),
  z.literal('neoLegacy'),
  z.literal('neox'),
  z.literal('bitcoin'),
  z.literal('ethereum'),
  z.literal('base'),
  z.literal('arbitrum'),
  z.literal('polygon'),
  z.literal('solana'),
  z.literal('stellar'),
])
