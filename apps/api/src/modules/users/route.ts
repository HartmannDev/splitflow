import type { FastifyInstance } from 'fastify'

import { requireAuth, requireRole } from '../auth/route-validator.ts'
import { buildUserController } from './controller.ts'
import { buildUserControllerDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function UsersRoute(app: FastifyInstance, deps: AppDependency) {
	const { createUser, getUser, getUsers, deleteUser, updateManagedUser, updateOwnUser } = buildUserController(deps)
	const { getUserDocs, getUsersDocs, createUserDocs, deleteUserDocs, updateManagedUserDocs, updateOwnUserDocs } =
		buildUserControllerDocs()

	app.post('/users', { schema: createUserDocs, preHandler: [requireAuth, requireRole('admin')] }, createUser)
	app.get('/users', { schema: getUsersDocs, preHandler: [requireAuth, requireRole('admin')] }, getUsers)
	app.get('/users/:id', { schema: getUserDocs, preHandler: [requireAuth, requireRole('admin')] }, getUser)
	app.patch(
		'/users/:id',
		{ schema: updateManagedUserDocs, preHandler: [requireAuth, requireRole('admin')] },
		updateManagedUser,
	)
	app.patch('/users/me', { schema: updateOwnUserDocs, preHandler: requireAuth }, updateOwnUser)
	app.delete('/users/:id', { schema: deleteUserDocs, preHandler: [requireAuth, requireRole('admin')] }, deleteUser)
}
