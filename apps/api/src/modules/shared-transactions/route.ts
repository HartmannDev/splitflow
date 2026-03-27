import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildSharedTransactionController } from './controller.ts'
import { buildSharedTransactionDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function sharedTransactionsRoute(app: FastifyInstance, deps: AppDependency) {
	const {
		getSharedTransactions,
		getSharedTransaction,
		getSharedTransactionParticipants,
		createSharedTransaction,
		updateSharedTransaction,
		acceptSharedTransaction,
		rejectSharedTransaction,
		markSharedTransactionPaid,
		confirmSharedTransactionPaid,
		deleteSharedTransaction,
	} = buildSharedTransactionController(deps)
	const {
		getSharedTransactionsDocs,
		getSharedTransactionDocs,
		getSharedTransactionParticipantsDocs,
		createSharedTransactionDocs,
		updateSharedTransactionDocs,
		acceptSharedTransactionDocs,
		rejectSharedTransactionDocs,
		markSharedTransactionPaidDocs,
		confirmSharedTransactionPaidDocs,
		deleteSharedTransactionDocs,
	} = buildSharedTransactionDocs()

	app.get('/shared-transactions', { schema: getSharedTransactionsDocs, preHandler: requireRole('user') }, getSharedTransactions)
	app.get('/shared-transactions/:id', { schema: getSharedTransactionDocs, preHandler: requireRole('user') }, getSharedTransaction)
	app.get(
		'/shared-transactions/:id/participants',
		{ schema: getSharedTransactionParticipantsDocs, preHandler: requireRole('user') },
		getSharedTransactionParticipants,
	)
	app.post('/shared-transactions', { schema: createSharedTransactionDocs, preHandler: requireRole('user') }, createSharedTransaction)
	app.patch('/shared-transactions/:id', { schema: updateSharedTransactionDocs, preHandler: requireRole('user') }, updateSharedTransaction)
	app.post(
		'/shared-transactions/:id/participants/:participantId/accept',
		{ schema: acceptSharedTransactionDocs, preHandler: requireRole('user') },
		acceptSharedTransaction,
	)
	app.post(
		'/shared-transactions/:id/participants/:participantId/reject',
		{ schema: rejectSharedTransactionDocs, preHandler: requireRole('user') },
		rejectSharedTransaction,
	)
	app.post(
		'/shared-transactions/:id/participants/:participantId/mark-paid',
		{ schema: markSharedTransactionPaidDocs, preHandler: requireRole('user') },
		markSharedTransactionPaid,
	)
	app.post(
		'/shared-transactions/:id/participants/:participantId/confirm-paid',
		{ schema: confirmSharedTransactionPaidDocs, preHandler: requireRole('user') },
		confirmSharedTransactionPaid,
	)
	app.delete('/shared-transactions/:id', { schema: deleteSharedTransactionDocs, preHandler: requireRole('user') }, deleteSharedTransaction)
}
