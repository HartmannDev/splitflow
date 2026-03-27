import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildTransactionController } from './controller.ts'
import { buildTransactionDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function transactionsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getTransactions, getTransaction, createTransaction, createTransfer, updateTransaction, deleteTransaction } =
		buildTransactionController(deps)
	const {
		getTransactionsDocs,
		getTransactionDocs,
		createTransactionDocs,
		createTransferDocs,
		updateTransactionDocs,
		deleteTransactionDocs,
	} = buildTransactionDocs()

	app.get('/transactions', { schema: getTransactionsDocs, preHandler: requireRole('user') }, getTransactions)
	app.get('/transactions/:id', { schema: getTransactionDocs, preHandler: requireRole('user') }, getTransaction)
	app.post('/transactions', { schema: createTransactionDocs, preHandler: requireRole('user') }, createTransaction)
	app.post('/transactions/transfers', { schema: createTransferDocs, preHandler: requireRole('user') }, createTransfer)
	app.patch('/transactions/:id', { schema: updateTransactionDocs, preHandler: requireRole('user') }, updateTransaction)
	app.delete('/transactions/:id', { schema: deleteTransactionDocs, preHandler: requireRole('user') }, deleteTransaction)
}
