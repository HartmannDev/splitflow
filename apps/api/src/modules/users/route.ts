import type { FastifyInstance } from 'fastify'

import { buildUserController } from './controller.ts'
import {
	createUserOptions,
	deleteUserOptions,
	getUserOptions,
	getUsersOptions,
	resetUserPasswordOptions,
	updateOwnUserOptions,
} from './docs.ts'
import { requireAuth, requireRole } from '../auth/route-validator.ts'
import type { AppDependency } from '../../types/app.js'

export async function UsersRoute(app: FastifyInstance, deps: AppDependency) {
	const { createUser, getUser, getUsers, resetUserPassword, deleteUser, updateOwnUser } = buildUserController(deps)

	app.post('/users', { schema: createUserOptions, preHandler: [requireAuth, requireRole('admin')] }, createUser)
	app.get('/users', { schema: getUsersOptions, preHandler: [requireAuth, requireRole('admin')] }, getUsers)
	app.get('/users/:id', { schema: getUserOptions, preHandler: [requireAuth, requireRole('admin')] }, getUser)
	app.patch('/users/me', { schema: updateOwnUserOptions, preHandler: requireAuth }, updateOwnUser)
	app.post(
		'/users/:id/reset-password',
		{ schema: resetUserPasswordOptions, preHandler: [requireAuth, requireRole('admin')] },
		resetUserPassword,
	)
	app.delete('/users/:id', { schema: deleteUserOptions, preHandler: [requireAuth, requireRole('admin')] }, deleteUser)
}
