import { z } from 'zod'

import { tokenSchema } from './token.schema'

export const noneArgsSchema = z.object({
  text: z.string(),
})

export const setActingAccountArgsSchema = z.object({
  text: z.string(),
  accountIds: z.array(z.string()),
})

export const setRecipientAddressArgsSchema = z.object({
  text: z.string(),
  accountIds: z.array(z.string()),
})

export const setTokenArgsSchema = z.object({
  text: z.string(),
  tokens: z.array(tokenSchema),
})

export const setAmountArgsSchema = z.object({
  text: z.string(),
})

export const transferArgsSchema = z.object({
  text: z.string(),
  actingAccountId: z.string(),
  recipientAddress: z.string(),
  token: tokenSchema,
  amount: z.string(),
})
