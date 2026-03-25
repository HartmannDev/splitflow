import type { FastifyInstance } from 'fastify'

import { buildUserController } from './controller.ts'
import { deleteUserOptions, getUsersOptions } from './docs.ts'
import { requireAuth, requireRole } from '../auth/route-validator.ts'
import type { AppDependency } from '../../types/app.js'

export async function UsersRoute(app: FastifyInstance, deps: AppDependency) {
	const { getUsers, deleteUser } = buildUserController(deps)

	app.get('/users', { schema: getUsersOptions, preHandler: [requireAuth, requireRole('admin')] }, getUsers)
	app.delete('/users/:id', { schema: deleteUserOptions, preHandler: [requireAuth, requireRole('admin')] }, deleteUser)
}
