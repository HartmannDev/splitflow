import type { FastifyInstance } from 'fastify'

import { createTransaction, getTransactions } from './controller.ts'
import { createTransactionOptions, getTransactionsOptions } from './docs.ts'

export async function transactionsRoute(app: FastifyInstance) {
	app.get('/transactions', getTransactionsOptions, getTransactions)

	app.post('/transactions', createTransactionOptions, createTransaction)
}
