import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildRecurringTransactionController } from './controller.ts'
import { buildRecurringTransactionDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function recurringTransactionsRoute(app: FastifyInstance, deps: AppDependency) {
	const {
		getRecurringTransactions,
		getRecurringTransaction,
		createRecurringTransaction,
		updateRecurringTransaction,
		generateDueRecurringTransactions,
		deleteRecurringTransaction,
	} = buildRecurringTransactionController(deps)
	const {
		getRecurringTransactionsDocs,
		getRecurringTransactionDocs,
		createRecurringTransactionDocs,
		updateRecurringTransactionDocs,
		generateDueRecurringTransactionsDocs,
		deleteRecurringTransactionDocs,
	} = buildRecurringTransactionDocs()

	app.get('/recurring-transactions', { schema: getRecurringTransactionsDocs, preHandler: requireRole('user') }, getRecurringTransactions)
	app.get('/recurring-transactions/:id', { schema: getRecurringTransactionDocs, preHandler: requireRole('user') }, getRecurringTransaction)
	app.post('/recurring-transactions', { schema: createRecurringTransactionDocs, preHandler: requireRole('user') }, createRecurringTransaction)
	app.patch('/recurring-transactions/:id', { schema: updateRecurringTransactionDocs, preHandler: requireRole('user') }, updateRecurringTransaction)
	app.post(
		'/recurring-transactions/generate-due',
		{ schema: generateDueRecurringTransactionsDocs, preHandler: requireRole('user') },
		generateDueRecurringTransactions,
	)
	app.delete('/recurring-transactions/:id', { schema: deleteRecurringTransactionDocs, preHandler: requireRole('user') }, deleteRecurringTransaction)
}
