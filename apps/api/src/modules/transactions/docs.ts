import z from 'zod'

import type { RouteShorthandOptions } from 'fastify/types/route'
import { CreateTransactionSchema, TransactionListSchema } from './model.ts'
import { withCommonErrorResponses } from '../../common/error-schemas.ts'

export const getTransactionsOptions: RouteShorthandOptions = {
	schema: {
		description: 'Get a list of transactions',
		tags: ['Transactions'],
		response: withCommonErrorResponses({
			200: TransactionListSchema.describe('Successful response with a list of transactions'),
		}),
	},
}

export const createTransactionOptions: RouteShorthandOptions = {
	schema: {
		description: 'Create a new transaction',
		tags: ['Transactions'],
		body: CreateTransactionSchema,
		response: withCommonErrorResponses({
			201: z.object({
				message: z.string(),
				transactionID: z.string(),
			}),
		}),
	},
}
