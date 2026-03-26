import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildAccountController } from './controller.ts'
import { buildAccountDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function accountsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getAccounts, createAccount, updateAccount, deleteAccount } = buildAccountController(deps)
	const { getAccountsDocs, createAccountDocs, updateAccountDocs, deleteAccountDocs } = buildAccountDocs()

	app.get('/accounts', { schema: getAccountsDocs, preHandler: requireRole('user') }, getAccounts)
	app.post('/accounts', { schema: createAccountDocs, preHandler: requireRole('user') }, createAccount)
	app.patch('/accounts/:id', { schema: updateAccountDocs, preHandler: requireRole('user') }, updateAccount)
	app.delete('/accounts/:id', { schema: deleteAccountDocs, preHandler: requireRole('user') }, deleteAccount)
}
