import type { FastifyInstance } from 'fastify'

import { deleteUser, getUsers } from './controller.ts'
import { deleteUserOptions, getUsersOptions } from './docs.ts'
import { requireAuth, requireRole } from '../auth/route-validator.ts'

export async function UsersRoute(app: FastifyInstance) {
	app.get('/users', { schema: getUsersOptions, preHandler: [requireAuth, requireRole('admin')] }, getUsers)
	app.delete('/users/:id', { schema: deleteUserOptions, preHandler: [requireAuth, requireRole('admin')] }, deleteUser)
}
